-- Keep existing stage codes and history intact until a collaborator explicitly reclassifies a prospect.
ALTER TYPE prospect_status ADD VALUE 'attempted_contact';
ALTER TYPE prospect_status ADD VALUE 'in_conversation';
ALTER TYPE prospect_status ADD VALUE 'proposal_sent';
ALTER TYPE prospect_status ADD VALUE 'negotiating';
