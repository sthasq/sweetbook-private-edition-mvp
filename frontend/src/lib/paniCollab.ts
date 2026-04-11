export type PaniCollabTemplateKey =
  | "travel-selfie"
  | "passport-poster"
  | "night-train";

export type PaniCollabTemplate = {
  key: PaniCollabTemplateKey;
  label: string;
  description: string;
  badge: string;
};

export type PaniCollabCandidate = {
  id: string;
  templateKey: PaniCollabTemplateKey;
  label: string;
  caption: string;
  imageUrl: string;
};

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 900;
export const PANI_COLLAB_OFFICIAL_PHOTO = "/demo-assets/COLABOBBANIE.jpg";
export const PANI_COLLAB_ASSET_VERSION = "2026-04-11-colabobbanie";

const assetDataUrlCache = new Map<string, Promise<string>>();

export const PANI_COLLAP_TEMPLATES: PaniCollabTemplate[] = [
  {
    key: "travel-selfie",
    label: "여행 동행 셀카",
    description: "낯선 도시에서 우연히 찍힌 셀카처럼 밝고 가볍게 연출합니다.",
    badge: "여행 무드",
  },
  {
    key: "passport-poster",
    label: "트래블 포스터 컷",
    description: "포스터와 스티커를 붙여 만든 콜라주처럼 기념컷을 만듭니다.",
    badge: "포스터 무드",
  },
  {
    key: "night-train",
    label: "야간 열차 기념컷",
    description: "밤기차 창가에서 남긴 앨범 컷처럼 차분한 톤으로 정리합니다.",
    badge: "야간 무드",
  },
];

export function isPaniBottleEdition(editionId: number) {
  return editionId === 1;
}

export async function readImageFileForCollab(file: File) {
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1440 / Math.max(image.width, image.height));
  canvas.width = Math.max(720, Math.round(image.width * ratio));
  canvas.height = Math.max(720, Math.round(image.height * ratio));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지를 준비하지 못했어요.");
  }

  context.fillStyle = "#f4efe7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawImageCover(context, image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function readAssetImageForCollab(assetUrl: string) {
  const cached = assetDataUrlCache.get(assetUrl);
  if (cached) {
    return cached;
  }

  const pending = loadImage(assetUrl)
    .then((image) => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 1440 / Math.max(image.width, image.height));
      canvas.width = Math.max(720, Math.round(image.width * ratio));
      canvas.height = Math.max(720, Math.round(image.height * ratio));

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("공식 콜라보 이미지를 준비하지 못했어요.");
      }

      context.fillStyle = "#f4efe7";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawImageCover(context, image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.9);
    });

  assetDataUrlCache.set(assetUrl, pending);
  return pending;
}

export async function generatePaniCollabCandidates(
  sourceImageUrl: string,
  templateKey: PaniCollabTemplateKey,
): Promise<PaniCollabCandidate[]> {
  const [source, avatar, officialPhoto, landscape] = await Promise.all([
    loadImage(sourceImageUrl),
    loadImage("/demo-assets/panibottle-avatar.jpg"),
    loadImage(PANI_COLLAB_OFFICIAL_PHOTO),
    loadImage("/demo-assets/panibottle-landscape.jpg"),
  ]);

  const template = PANI_COLLAP_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) {
    throw new Error("콜라보 템플릿을 찾지 못했어요.");
  }

  const variants = [0, 1] as const;
  return variants.map((variant) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("콜라보 컷을 만들지 못했어요.");
    }

    switch (templateKey) {
      case "travel-selfie":
        drawTravelSelfie(context, source, officialPhoto, avatar, variant);
        break;
      case "passport-poster":
        drawPassportPoster(context, source, officialPhoto, landscape, avatar, variant);
        break;
      case "night-train":
        drawNightTrain(context, source, officialPhoto, landscape, avatar, variant);
        break;
    }

    const suffix = variant === 0 ? "A컷" : "B컷";
    return {
      id: `${templateKey}-${suffix}`,
      templateKey,
      label: template.label,
      caption: `${template.label} ${suffix}`,
      imageUrl: canvas.toDataURL("image/jpeg", 0.82),
    };
  });
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지 자산을 불러오지 못했어요."));
    image.src = src;
  });
}

function drawTravelSelfie(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  officialPhoto: CanvasImageSource,
  avatar: CanvasImageSource,
  variant: number,
) {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, variant === 0 ? "#f7dfb6" : "#f4c98c");
  gradient.addColorStop(1, variant === 0 ? "#ef8c54" : "#ce6f3d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.save();
  context.globalAlpha = 0.28;
  drawImageCover(context, officialPhoto, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.restore();

  context.save();
  context.translate(730, 130);
  context.rotate(variant === 0 ? -0.08 : 0.06);
  roundedRectPath(context, 0, 0, 360, 500, 28);
  context.clip();
  drawImageCover(context, source, 0, 0, 360, 500);
  context.restore();

  context.save();
  roundedRectPath(context, 70, 170, 510, 610, 32);
  context.clip();
  drawImageCover(context, officialPhoto, 70, 170, 510, 610);
  context.restore();

  context.fillStyle = "rgba(22, 18, 12, 0.2)";
  context.fillRect(70, 520, 510, 260);

  context.fillStyle = "#fff8ef";
  context.font = "700 56px Georgia";
  context.fillText("TRAVEL", 80, 120);
  context.font = "700 74px Georgia";
  context.fillText("WITH ASTRA", 80, 198);
  context.font = "500 28px sans-serif";
  context.fillText("OFFICIAL COLLAB CUT", 82, 244);

  context.fillStyle = "#fffaf3";
  context.font = "600 34px sans-serif";
  context.fillText(
    variant === 0 ? "낯선 도시에서 남긴 밝은 한 장면" : "여행 메모처럼 가볍게 남긴 순간",
    98,
    600,
  );
  context.font = "500 24px sans-serif";
  context.fillText("Astra Vale edition prototype", 98, 646);

  drawAvatarBadge(context, avatar, 92, 684, "AstraVale");
}

function drawPassportPoster(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  officialPhoto: CanvasImageSource,
  landscape: CanvasImageSource,
  avatar: CanvasImageSource,
  variant: number,
) {
  context.fillStyle = "#f6f0e7";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.save();
  context.translate(150, 120);
  context.rotate(-0.04);
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, 420, 580);
  context.strokeStyle = "#c58a53";
  context.lineWidth = 4;
  context.strokeRect(0, 0, 420, 580);
  context.font = "700 42px Georgia";
  context.fillStyle = "#b56738";
  context.fillText("POSTCARD", 34, 74);
  roundedRectPath(context, 34, 110, 352, 410, 24);
  context.clip();
  drawImageCover(context, source, 34, 110, 352, 410);
  context.restore();

  context.save();
  context.translate(640, 150);
  context.rotate(variant === 0 ? 0.05 : -0.04);
  roundedRectPath(context, 0, 0, 420, 540, 26);
  context.clip();
  drawImageCover(context, variant === 0 ? officialPhoto : landscape, 0, 0, 420, 540);
  context.restore();

  context.fillStyle = "#8b4a24";
  context.font = "700 52px Georgia";
  context.fillText("ASTRA MEMORY", 118, 784);
  context.font = "500 24px sans-serif";
  context.fillText(
    variant === 0 ? "여행 포스터처럼 정리한 공식 콜라보 컷" : "티켓과 스탬프를 붙인 기념컷 무드",
    122,
    826,
  );

  drawStamp(context, 620, 76, variant === 0 ? "#d67644" : "#276f7a", "PASSPORT");
  drawStamp(context, 812, 108, "#c6a357", "TRAVEL");
  drawAvatarBadge(context, avatar, 932, 736, "AstraVale");
}

function drawNightTrain(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  officialPhoto: CanvasImageSource,
  landscape: CanvasImageSource,
  avatar: CanvasImageSource,
  variant: number,
) {
  const gradient = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, "#1f2c4f");
  gradient.addColorStop(1, variant === 0 ? "#0b162d" : "#1d1830");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.save();
  context.globalAlpha = 0.35;
  drawImageCover(context, landscape, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.restore();

  context.fillStyle = "rgba(255, 225, 166, 0.18)";
  context.fillRect(70, 70, 430, 760);

  context.save();
  roundedRectPath(context, 118, 120, 334, 520, 26);
  context.clip();
  drawImageCover(context, source, 118, 120, 334, 520);
  context.restore();

  context.save();
  roundedRectPath(context, 618, 148, 460, 430, 32);
  context.clip();
  drawImageCover(context, officialPhoto, 618, 148, 460, 430);
  context.restore();

  context.fillStyle = "#f3ead8";
  context.font = "700 56px Georgia";
  context.fillText("MIDNIGHT", 620, 664);
  context.font = "700 68px Georgia";
  context.fillText("JOURNEY", 620, 738);
  context.font = "500 24px sans-serif";
  context.fillText(
    variant === 0 ? "밤기차 창가에 기대 남긴 여행 앨범 컷" : "이동 직전의 공기를 눌러 담은 기념컷",
    620,
    792,
  );

  drawAvatarBadge(context, avatar, 112, 692, "AstraVale");
}

function drawAvatarBadge(
  context: CanvasRenderingContext2D,
  avatar: CanvasImageSource,
  x: number,
  y: number,
  label: string,
) {
  context.save();
  context.fillStyle = "rgba(255,255,255,0.9)";
  roundedRectPath(context, x, y, 170, 92, 46);
  context.fill();

  context.beginPath();
  context.arc(x + 46, y + 46, 28, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  drawImageCover(context, avatar, x + 18, y + 18, 56, 56);
  context.restore();

  context.fillStyle = "#2f2518";
  context.font = "700 20px sans-serif";
  context.fillText(label, x + 86, y + 40);
  context.font = "500 16px sans-serif";
  context.fillText("official collab", x + 86, y + 66);
}

function drawStamp(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  label: string,
) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.18);
  context.strokeStyle = color;
  context.lineWidth = 6;
  context.strokeRect(0, 0, 150, 64);
  context.font = "700 22px sans-serif";
  context.fillStyle = color;
  context.fillText(label, 24, 40);
  context.restore();
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const { width: imageWidth, height: imageHeight } = getImageDimensions(image, width, height);
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function getImageDimensions(
  image: CanvasImageSource,
  fallbackWidth: number,
  fallbackHeight: number,
) {
  if (image instanceof HTMLImageElement) {
    return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  }
  if (image instanceof HTMLCanvasElement || image instanceof OffscreenCanvas) {
    return { width: image.width, height: image.height };
  }
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height };
  }
  if (typeof VideoFrame !== "undefined" && image instanceof VideoFrame) {
    return { width: image.displayWidth, height: image.displayHeight };
  }
  if (image instanceof HTMLVideoElement) {
    return { width: image.videoWidth || fallbackWidth, height: image.videoHeight || fallbackHeight };
  }
  return { width: fallbackWidth, height: fallbackHeight };
}
