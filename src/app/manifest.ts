import type { MetadataRoute } from "next";

type ShareTargetManifest = MetadataRoute.Manifest & {
  share_target: {
    action: string;
    method: "GET";
    params: {
      text: string;
      title: string;
      url: string;
    };
  };
};

export default function manifest(): MetadataRoute.Manifest {
  const manifest: ShareTargetManifest = {
    id: "/mobile-app",
    name: "KBO Fan Hub",
    short_name: "KBO Fan",
    description:
      "경기방, 기록실, 뉴스, 커뮤니티를 한 화면에서 보는 야구 팬 앱 프로토타입",
    start_url: "/mobile-app",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6fb",
    theme_color: "#071a3d",
    orientation: "portrait",
    categories: ["sports", "news", "social"],
    share_target: {
      action: "/mobile-app/write?source=web-share&tags=KBO,뉴스,공유",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };

  return manifest;
}
