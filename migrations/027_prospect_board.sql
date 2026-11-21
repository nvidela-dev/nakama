ALTER TABLE prospects ADD COLUMN linear_url text;
ALTER TYPE prospect_event_kind ADD VALUE 'stage';
CREATE TABLE prospect_todos (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(catalogue_id, prospect_id, id),
  FOREIGN KEY(catalogue_id, prospect_id) REFERENCES prospects ON DELETE CASCADE
);

-- Search the compact index without reading image bytes or expanding research dossiers.
CREATE TABLE prospect_facets (
  catalogue_id text NOT NULL,
  prospect_id uuid NOT NULL,
  region text NOT NULL, city text NOT NULL, industry text NOT NULL,
  identity_state text NOT NULL, services text[] NOT NULL, search_text text NOT NULL,
  PRIMARY KEY(catalogue_id, prospect_id),
  FOREIGN KEY(catalogue_id, prospect_id) REFERENCES prospects ON DELETE CASCADE
);
CREATE FUNCTION index_prospect_release(cat text, archive text, meta jsonb) RETURNS void
LANGUAGE sql AS $$
  WITH industry_map AS MATERIALIZED (
    SELECT key,value FROM jsonb_each_text(coalesce(meta#>'{sharedDocuments,industry-groups,business_assignments}','{}'))
  ), industries AS (
    SELECT entry->>'id' AS id,entry->>'label' AS label
    FROM jsonb_array_elements(coalesce(meta#>'{sharedDocuments,industry-groups,groups}','[]')) entry
  ), identities AS MATERIALIZED (
    SELECT key,value FROM jsonb_each(coalesce(meta#>'{catalogue,identity_status,businesses}','{}'))
  ), service_tags AS (
    SELECT tag->>'id' AS id,tag->>'label' AS label FROM jsonb_array_elements(coalesce(meta#>'{catalogue,service_tags,tags}','[]')) tag
  ), service_groups AS MATERIALIZED (
    SELECT key,array_agg(DISTINCT coalesce(t.label,a->>'tag_id')) AS labels,
      string_agg(a->>'opportunity_hypothesis',' ') AS terms
    FROM jsonb_each(coalesce(meta#>'{catalogue,service_tags,businesses}','{}')) m
    CROSS JOIN LATERAL jsonb_array_elements(m.value) a LEFT JOIN service_tags t ON t.id=a->>'tag_id'
    WHERE a->>'status' IN ('conditional','supported') AND a->>'tag_id' IS NOT NULL GROUP BY key
  ), source AS (
    SELECT DISTINCT ON (s.prospect_id) s.prospect_id,coalesce(s.payload->'index',s.payload->'business') AS idx
    FROM prospect_sources s WHERE s.catalogue_id=cat AND s.digest=archive
    ORDER BY s.prospect_id, (s.source_rank=2) DESC,s.source_rank DESC
  )
  INSERT INTO prospect_facets(catalogue_id,prospect_id,region,city,industry,identity_state,services,search_text)
  SELECT cat,s.prospect_id,coalesce(idx->>'region',''),coalesce(idx->>'city',''),coalesce(i.label,idx->>'category',''),
    CASE WHEN ident.value->>'identity_type'='corroborated_third_party_listing' OR ident.value->>'status'='tentative' THEN 'tentative'
    WHEN ident.value->>'identity_type' IN ('company_domain','managed_profile') THEN 'recorded' ELSE 'unknown' END,
    coalesce(sg.labels,'{}'::text[]),concat_ws(' ',idx->>'search',idx->>'category',idx->>'city',i.label,array_to_string(sg.labels,' '),sg.terms)
  FROM source s LEFT JOIN industry_map im ON im.key=s.prospect_id::text LEFT JOIN industries i ON i.id=im.value
  LEFT JOIN identities ident ON ident.key=s.prospect_id::text LEFT JOIN service_groups sg ON sg.key=s.prospect_id::text
  ON CONFLICT(catalogue_id,prospect_id) DO UPDATE SET region=EXCLUDED.region,city=EXCLUDED.city,industry=EXCLUDED.industry,
    identity_state=EXCLUDED.identity_state,services=EXCLUDED.services,search_text=EXCLUDED.search_text
$$;
CREATE FUNCTION index_completed_prospect_release() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM index_prospect_release(NEW.catalogue_id,NEW.digest,NEW.metadata);
  RETURN NEW;
END $$;
CREATE TRIGGER index_completed_release AFTER UPDATE OF completed_at ON prospect_imports
  FOR EACH ROW WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL) EXECUTE FUNCTION index_completed_prospect_release();
DO $$ DECLARE receipt record; BEGIN
  FOR receipt IN SELECT catalogue_id,digest,metadata FROM prospect_imports WHERE completed_at IS NOT NULL ORDER BY sequence LOOP
    PERFORM index_prospect_release(receipt.catalogue_id,receipt.digest,receipt.metadata);
  END LOOP;
END $$;
