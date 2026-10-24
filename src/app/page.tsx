import { WaveMark } from "@/shared/ui/wave-mark";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getT } from "@/shared/i18n/server";
import Link from "next/link";
import { authConfigured } from "@/features/access/server/auth";
export default async function Home() {
  if (authConfigured() && (await auth()).isAuthenticated) redirect("/projects");
  const t = await getT();
  return (
    <main
      id="main"
      className={
        "landing max-w-360 m-auto grid grid-cols-[1.05fr_1fr] py-0 px-[6%] max-[1000px]:grid-cols-[1fr_1fr] max-[700px]:block max-[700px]:overflow-hidden"
      }
    >
      <section
        className={
          "hero pt-25 px-0 pb-17.5 relative z-[1] min-[1450px]:pt-30 max-[700px]:pt-15 max-[700px]:pb-5"
        }
      >
        <div
          className={
            "eyebrow text-[10px] tracking-[2px] text-lime font-bold block mb-5.5 lg:compact:tracking-[1.3px]"
          }
        >
          <span
            className={
              "[&:first-child:not(:last-child)]:inline-block [&:first-child:not(:last-child)]:w-1.5 [&:first-child:not(:last-child)]:h-1.5 [&:first-child:not(:last-child)]:bg-lime [&:first-child:not(:last-child)]:rounded-full [&:first-child:not(:last-child)]:mr-2"
            }
          />{" "}
          {t("PROJECT DEVELOPMENT AND COLLABORATION")}{" "}
        </div>
        <h1
          className={
            "mt-0 font-mono font-medium text-[clamp(45px,_5.2vw,_75px)] leading-[1.08] mb-6.5 tracking-[-4px] max-[1000px]:text-[52px] max-[700px]:text-[52px] max-[700px]:tracking-[-2.8px]"
          }
        >
          {t("Develop projects")} <br />
          {t("with your")} <em className={"[font-style:normal] text-lime"}>{t("team.")}</em>
        </h1>
        <p
          className={
            "hero-copy mb-[1em] mt-0 text-muted text-[16px] leading-[1.9] max-[700px]:text-[14px]"
          }
        >
          {t("Define the project. Evaluate assumptions.")} <br />
          {t("Plan the work and collaborate in one place.")}{" "}
        </p>
        <div
          className={
            "hero-actions flex items-center gap-5 mt-8.5 max-[1000px]:flex-col max-[1000px]:items-start max-[1000px]:gap-3 max-[700px]:flex-row max-[700px]:gap-3.75"
          }
        >
          {authConfigured() ? (
            <Link
              className={
                "button border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:#e9ffc1] hover:[transform:translateY(-1px)]"
              }
              href="/projects"
            >
              {t("Open projects")}{" "}
            </Link>
          ) : (
            <Link
              className={
                "button border-0 rounded-[9px] inline-flex items-center justify-center gap-3 min-h-12 py-3.25 px-5.5 bg-lime text-dark font-bold cursor-pointer [transition:background_0.15s,_transform_0.15s] hover:[background:#e9ffc1] hover:[transform:translateY(-1px)]"
              }
              href="/preview"
            >
              {t("View example")}{" "}
            </Link>
          )}
          <span className={"text-[11px] text-muted max-[700px]:max-w-20"}>
            {t("Private project workspaces.")}
          </span>
        </div>
        <div
          className={
            "hero-note text-[11px] text-muted mt-14.5 flex items-center gap-2.5 max-[700px]:mt-7.5 max-[700px]:text-[10px]"
          }
        >
          <span aria-hidden="true" className={"text-pink text-[22px]"}>
            ✦
          </span>{" "}
          {t("Structured workflows for business and creative projects.")}{" "}
        </div>
      </section>
      <section
        className={
          "map-scene relative min-h-150 isolate [background:radial-gradient(ellipse_at_55%_50%,_#54704a26,_transparent_65%)] min-[1450px]:[transform:scale(1.06)] min-[1450px]:[transform-origin:center] max-[1000px]:[transform:scale(0.8)] max-[1000px]:[transform-origin:center_left] max-[1000px]:w-112.5 max-[1000px]:ml-[-20px] max-[700px]:h-113.75 max-[700px]:min-h-113.75 max-[700px]:w-110 max-[700px]:[transform:scale(0.78)] max-[700px]:[transform-origin:top_left] max-[700px]:mt-0 max-[700px]:mx-0 max-[700px]:mb-[-70px] max-[700px]:left-[calc((100%_-_343px)_/_2)]"
        }
        aria-label={t("Illustration of an idea growing through small steps")}
      >
        <div
          className={
            "orbit orbit-one absolute [border:1px_dashed_#73947c35] rounded-full w-120 h-65 [transform:rotate(-25deg)] left-0 top-57.5 z-[-1] max-[700px]:top-42.5"
          }
        />
        <div
          className={
            "orbit orbit-two absolute [border:1px_dashed_#73947c35] rounded-full z-[-1] max-[700px]:top-42.5 w-90 h-105 [transform:rotate(35deg)] top-35 left-15"
          }
        />
        <span
          className={
            "map-coordinate absolute right-0 top-16 [color:#7a9188] [font:9px_monospace] tracking-[2px] max-[700px]:top-7"
          }
        >
          {t("PROJECT OVERVIEW")}
        </span>
        <div
          className={
            "floating-note note-one absolute bg-[#223530] border border-[#4e6754] rounded-[12px] [box-shadow:0_20px_50px_#0004] p-5.5 z-[4] top-28.75 left-7 [transform:rotate(-6deg)] w-66.25 max-[700px]:top-16.25"
          }
        >
          <span className={"[font:9px_monospace] tracking-[2px] text-lime"}>
            {t("01 / CONCEPT")}
          </span>
          <strong className={"block font-mono text-[21px] mt-[10px]"}>
            {t("Audio production")}
          </strong>
          <p className={"text-[11px] text-muted mt-[5px] mx-[0] mb-[20px]"}>
            {t("“Produce a short audio episode.”")}
          </p>
          <div className={"avatars flex items-center"}>
            <i
              className={
                "w-6.5 h-6.5 grid place-items-center text-[10px] [font-style:normal] bg-[#c7a797] [color:#25312d] rounded-full [border:2px_solid_#223530] mr-[-5px] [&:nth-child(2)]:bg-[#a6baba] [&:nth-child(3)]:bg-[#a8c179]"
              }
            >
              M
            </i>
            <i
              className={
                "w-6.5 h-6.5 grid place-items-center text-[10px] [font-style:normal] bg-[#c7a797] [color:#25312d] rounded-full [border:2px_solid_#223530] mr-[-5px] [&:nth-child(2)]:bg-[#a6baba] [&:nth-child(3)]:bg-[#a8c179]"
              }
            >
              J
            </i>
            <i
              className={
                "w-6.5 h-6.5 grid place-items-center text-[10px] [font-style:normal] bg-[#c7a797] [color:#25312d] rounded-full [border:2px_solid_#223530] mr-[-5px] [&:nth-child(2)]:bg-[#a6baba] [&:nth-child(3)]:bg-[#a8c179]"
              }
            >
              +1
            </i>
            <small className={"text-[9px] text-muted ml-[14px]"}>{t("Project members")}</small>
          </div>
        </div>
        <div className="map-path" />
        <div
          className={
            "island absolute w-72.5 h-51.25 left-33.75 top-78.75 [transform:rotate(-8deg)] max-[700px]:top-62.5"
          }
        >
          <div
            className={
              "island-top absolute w-72.5 h-35 rounded-[46%_48%_42%_45%] [background:radial-gradient(ellipse_at_50%_30%,_#a2b46a,_#6e8751_70%)] [box-shadow:inset_-9px_-14px_0_#5b7445] z-[2] [transform:rotate(-6deg)]"
            }
          >
            <div
              className={
                "flag absolute left-31.25 top-[-105px] h-38.75 w-1.25 bg-[#b5b69c] [transform:rotate(8deg)] [box-shadow:3px_2px_0_#0002]"
              }
            >
              <span
                className={
                  "grid place-items-center absolute left-1 top-0 bg-lime [color:#334c30] w-20 h-13 [clip-path:polygon(0_0,_100%_12%,_85%_56%,_100%_100%,_0_88%)] text-[34px]"
                }
              >
                <WaveMark />
              </span>
            </div>
            <span
              className={
                "tree tree-one absolute text-[55px] [color:#314f3d] [text-shadow:3px_3px_#81965c] left-8.75 top-0"
              }
            >
              ✦
            </span>
            <span
              className={
                "tree tree-two absolute [color:#314f3d] [text-shadow:3px_3px_#81965c] right-8.75 top-6.75 text-[40px]"
              }
            >
              ✦
            </span>
            <span
              className={
                "stone absolute w-[40px] h-[20px] bg-[#c1c297] bottom-[24px] left-[102px] rounded-[45%]"
              }
            />
          </div>
          <div
            className={
              "island-base absolute w-67.5 h-37.5 top-13.75 left-2.5 [background:linear-gradient(125deg,_#4e5944,_#293d32_65%)] [clip-path:polygon(0_0,_100%_0,_86%_55%,_63%_96%,_30%_74%,_12%_44%)]"
            }
          />
        </div>
        <div
          className={
            "floating-note note-two absolute bg-[#223530] border border-[#4e6754] rounded-[12px] [box-shadow:0_20px_50px_#0004] p-5.5 z-[4] top-112.5 left-1.25 [transform:rotate(4deg)] text-[13px] py-3.5 px-4.5 max-[700px]:top-95"
          }
        >
          <span
            className={"status-dot inline-block bg-lime w-[7px] h-[7px] rounded-[50%] mr-[6px]"}
          />{" "}
          {t("Prototype")} <br />
          <small className={"text-muted text-[10px]"}>{t("Record a one-minute sample.")}</small>
        </div>
        <span
          className={
            "compass absolute right-2.5 bottom-18.75 [color:#a9b48d] [font:10px_monospace] text-center max-[700px]:bottom-0"
          }
          aria-hidden="true"
        >
          N<br />✧
        </span>
        <span
          className={
            "scene-caption absolute bottom-3.75 left-25 [font:10px_monospace] [color:#7e9488] max-[700px]:hidden"
          }
        >
          {t("Stages, decisions, and revisions.")}{" "}
        </span>
      </section>
      <section
        id="how-it-works"
        className={
          "how [grid-column:1/-1] border-t border-t-line pt-12 px-0 pb-14.5 [&_>_.eyebrow]:mb-3 max-[700px]:pt-8.75"
        }
      >
        <div>
          <span
            className={
              "eyebrow text-[10px] tracking-[2px] text-lime font-bold block mb-5.5 [&_>_span:first-child:not(:last-child)]:inline-block [&_>_span:first-child:not(:last-child)]:w-1.5 [&_>_span:first-child:not(:last-child)]:h-1.5 [&_>_span:first-child:not(:last-child)]:bg-lime [&_>_span:first-child:not(:last-child)]:rounded-full [&_>_span:first-child:not(:last-child)]:mr-2 lg:compact:tracking-[1.3px]"
            }
          >
            {t("FROM DEFINITION TO DELIVERY")}
          </span>
          <h2
            className={
              "mb-[0.83em] mt-0 font-mono tracking-[-0.045em] font-medium lg:compact:text-[19px] lg:compact:mx-0 lg:compact:mb-3 text-[30px] max-[700px]:text-[26px]"
            }
          >
            {t("A structured project workflow.")}
          </h2>
        </div>
        <div
          className={
            "steps grid grid-cols-[repeat(3,_1fr)] gap-15 mt-9 max-[1000px]:gap-7.5 max-[700px]:grid-cols-[1fr] max-[700px]:gap-5.5"
          }
        >
          <article
            className={"max-[700px]:grid max-[700px]:grid-cols-[35px_1fr] max-[700px]:gap-x-3"}
          >
            <span
              className={
                "[font:11px_monospace] [color:#91a181] block mb-4.5 max-[700px]:[grid-row:1/3] max-[700px]:mt-1.5"
              }
            >
              01
            </span>
            <h3
              className={
                "mb-[1em] mt-0 font-mono font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-[19px] tracking-[-0.5px] max-[700px]:mb-2.5"
              }
            >
              {t("Define the project.")}
            </h3>
            <p
              className={
                "mb-[1em] mt-0 text-[13px] text-muted max-w-67.5 max-[700px]:[grid-column:2] max-[700px]:max-w-[none] max-[700px]:mb-0"
              }
            >
              {t("Record the project's name, purpose, and scope.")}
            </p>
          </article>
          <article
            className={"max-[700px]:grid max-[700px]:grid-cols-[35px_1fr] max-[700px]:gap-x-3"}
          >
            <span
              className={
                "[font:11px_monospace] [color:#91a181] block mb-4.5 max-[700px]:[grid-row:1/3] max-[700px]:mt-1.5"
              }
            >
              02
            </span>
            <h3
              className={
                "mb-[1em] mt-0 font-mono font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-[19px] tracking-[-0.5px] max-[700px]:mb-2.5"
              }
            >
              {t("Add collaborators.")}
            </h3>
            <p
              className={
                "mb-[1em] mt-0 text-[13px] text-muted max-w-67.5 max-[700px]:[grid-column:2] max-[700px]:max-w-[none] max-[700px]:mb-0"
              }
            >
              {t("Manage membership independently for each project.")}{" "}
            </p>
          </article>
          <article
            className={"max-[700px]:grid max-[700px]:grid-cols-[35px_1fr] max-[700px]:gap-x-3"}
          >
            <span
              className={
                "[font:11px_monospace] [color:#91a181] block mb-4.5 max-[700px]:[grid-row:1/3] max-[700px]:mt-1.5"
              }
            >
              03
            </span>
            <h3
              className={
                "mb-[1em] mt-0 font-mono font-semibold lg:compact:text-[15px] lg:compact:mt-3 lg:compact:mx-0 lg:compact:mb-2 text-[19px] tracking-[-0.5px] max-[700px]:mb-2.5"
              }
            >
              {t("Test and develop.")}
            </h3>
            <p
              className={
                "mb-[1em] mt-0 text-[13px] text-muted max-w-67.5 max-[700px]:[grid-column:2] max-[700px]:max-w-[none] max-[700px]:mb-0"
              }
            >
              {t("Record answers, test assumptions, and track decisions.")}{" "}
            </p>
          </article>
        </div>
      </section>
      <section
        className={
          "closing-note [grid-column:1/-1] border-t border-t-line flex items-center gap-6 py-8 px-0 max-[700px]:flex-wrap max-[700px]:gap-5"
        }
      >
        <span className={"text-[48px] text-pink"}>
          <WaveMark />
        </span>
        <p className={"text-[14px] m-0 text-muted"}>
          {t("Business development.")} <br />
          {t("Creative production.")} <br />
          <strong className={"text-ink font-normal"}>
            {t("Choose the workflow that fits your project.")}
          </strong>
        </p>
        {!authConfigured() && (
          <small
            className={
              "max-w-65 ml-[auto] text-muted text-[11px] max-[700px]:ml-0 max-[700px]:max-w-[none] max-[700px]:w-full"
            }
          >
            {t("Sign-in must be configured to use private projects.")}{" "}
          </small>
        )}
      </section>
    </main>
  );
}
