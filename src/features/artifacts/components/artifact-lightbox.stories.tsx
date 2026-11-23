import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import { ArtifactLightbox } from "./artifact-lightbox";
import { Button } from "@/shared/ui/button";
export default { title: "Artifacts/Lightbox" } satisfies Meta;
function Gallery() {
  const [image, setImage] = useState<number | null>(null);
  return (
    <>
      <Button onClick={() => setImage(0)}>Open preview</Button>
      <ArtifactLightbox
        image={image}
        setImage={setImage}
        closeImage={() => setImage(null)}
        images={[
          { id: "icon-192", name: "Small icon", media_type: "image/png", size: 1024 },
          { id: "icon-512", name: "Large icon", media_type: "image/png", size: 2048 },
        ]}
        fileUrl={(id) => `/icons/${id}.png`}
      />
    </>
  );
}
export const KeyboardNavigation = { render: () => <Gallery /> };
