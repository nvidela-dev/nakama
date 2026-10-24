import Image from "next/image";
import { getWikiT as getT } from "@/features/shell/wiki-i18n";
import { wikiTrees, type WikiTreeNode } from "@/features/shell/wiki-trees";

type Translate = (text: string) => string;
function TreeNode({ node, t }: { node: WikiTreeNode; t: Translate }) {
  const label = <span className={"shell-wiki-tree-label wrap-anywhere"}>{t(node.label)}</span>;
  return (
    <li className="relative min-w-0 pt-2.5">
      {node.children?.length ? (
        <details className="border-b border-line py-2" open>
          <summary className="cursor-pointer rounded-md border border-line bg-panel px-3 py-2 text-lime">
            {label}
          </summary>
          <ul className="ml-3 border border-line pl-5">
            {node.children.map((child) => (
              <TreeNode key={child.label} node={child} t={t} />
            ))}
          </ul>
        </details>
      ) : (
        <div className={"shell-wiki-tree-leaf rounded-md border border-line bg-panel px-3 py-2"}>
          {label}
        </div>
      )}
    </li>
  );
}

export async function WikiVisuals({ chapter }: { chapter: string }) {
  const t = await getT();
  const trees = wikiTrees.filter((tree) => tree.chapter === chapter);
  const picture =
    chapter === "map"
      ? {
          src: "/wiki/project-workbench.webp",
          title: "A shared place for ideas, actions, and outputs",
          alt: "Illustration of people organizing questions, tasks, and artwork on one shared project workbench.",
          caption:
            "An illustration of the project workspace, not a screenshot. Use the tree below to see how its parts relate.",
        }
      : chapter === "daily"
        ? {
            src: "/wiki/related-projects.webp",
            title: "Related projects, independent workspaces",
            alt: "Illustration of three separate project workbenches connected by branching paths.",
            caption: "A shared origin connects these projects. Access and content stay separate.",
          }
        : null;
  return (
    <>
      {picture && (
        <figure
          className={
            "shell-wiki-picture my-0 mb-6 overflow-hidden rounded-lg border border-line bg-panel"
          }
        >
          <Image
            className="block h-auto w-full object-contain"
            src={picture.src}
            alt={t(picture.alt)}
            width={1536}
            height={1024}
            sizes="(max-width: 700px) 95vw, (max-width: 1400px) 70vw, 1000px"
          />
          <figcaption className="p-4">
            <strong>{t(picture.title)}</strong>
            <p className="my-2">{t(picture.caption)}</p>
          </figcaption>
        </figure>
      )}
      {trees.map((tree) => (
        <figure
          className={"shell-wiki-tree my-0 mb-6 rounded-lg border border-line bg-panel p-4"}
          key={tree.id}
          aria-labelledby={tree.id}
        >
          <figcaption className="p-4" id={tree.id}>
            <h3 className="mb-2 text-[14px] font-semibold">{t(tree.title)}</h3>
            <p className="my-2">{t(tree.caption)}</p>
          </figcaption>
          <small className="block text-muted">
            {t("Open or close a branch to follow its relationships.")}
          </small>
          <ul aria-label={t(tree.title)}>
            <TreeNode node={tree.root} t={t} />
          </ul>
        </figure>
      ))}
    </>
  );
}
