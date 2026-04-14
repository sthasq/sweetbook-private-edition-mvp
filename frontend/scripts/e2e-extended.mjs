/**
 * 확장 E2E: 회원가입 → 개인화(LLM) → 미리보기 → Sweetbook 생성·확정 → 배송·견적 → 결제/주문 UI
 *
 * 사전 조건: Vite(3000) + API(8080) 실행, Playwright 브라우저 설치
 *   npx playwright install chromium
 *
 * 실행: npm run e2e:extended
 *
 * Sweetbook 라이브 연동이 실패하는 환경에서는 배송·결제 단계를 건너뛰고 종료 코드 0으로 통과합니다.
 * 반드시 끝까지 실패시키려면: E2E_STRICT=1 npm run e2e:extended
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const E2E_STRICT =
  process.env.E2E_STRICT === "1" || process.env.E2E_STRICT === "true";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const log = (...a) => console.log("[e2e]", ...a);

function appUrl(pathname = "") {
  const normalizedBase = BASE.endsWith("/") ? BASE : `${BASE}/`;
  const normalizedPath = pathname.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBase).toString();
}

async function login(page, email, password) {
  await page.goto(appUrl("/login"), { waitUntil: "domcontentloaded" });
  await page.locator("#email").waitFor({ state: "visible", timeout: 15_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith("/login"), {
      timeout: 30_000,
    }),
    page.locator('form button[type="submit"]').click(),
  ]);
}

async function signupFan(page, { email, password, displayName }) {
  await page.goto(appUrl("/signup"), { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("이름을 적어 주세요").fill(displayName);
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("8자 이상").fill(password);
  await Promise.all([
    page.waitForURL(/\/me\/projects/, { timeout: 45_000 }),
    page.getByRole("button", { name: "회원가입" }).click(),
  ]);
}

async function createProjectViaApi(request, mode = "demo") {
  const csrfRes = await request.get(`${BASE}/api/auth/csrf`);
  assert(csrfRes.ok(), `csrf ${csrfRes.status()}`);
  const csrf = await csrfRes.json();

  const createRes = await request.post(`${BASE}/api/projects`, {
    headers: {
      "Content-Type": "application/json",
      "X-XSRF-TOKEN": csrf.token,
    },
    data: { mode },
  });
  assert(createRes.ok(), `create project ${createRes.status()}`);
  return createRes.json();
}

async function tryClickFirstVideoSuggestion(page) {
  const card = page.locator(".editorial-card").filter({ hasText: "참고할 장면 후보" });
  const btn = card.locator("button").filter({ has: page.locator("img") }).first();
  try {
    await btn.waitFor({ state: "visible", timeout: 5000 });
    await btn.click();
    return true;
  } catch {
    return false;
  }
}

async function drivePersonalizationToPreview(page, projectId, { maxMs }) {
  const deadline = Date.now() + maxMs;
  let clickedVideo = false;

  while (Date.now() < deadline) {
    if (page.url().includes("/preview")) {
      return;
    }

    if (page.url().includes("/personalize")) {
      const fatalError = page
        .locator("div.rounded.border.border-red-200, div.rounded.border.border-rose-200, div.rounded.border.border-red-200.bg-red-50")
        .filter({ hasText: /OpenRouter|개인화 대화를 불러오지 못했어요/ })
        .first();
      if (await fatalError.isVisible().catch(() => false)) {
        log("WARN", "개인화 인터뷰를 건너뛰고 preview로 이동합니다.");
        await page.goto(appUrl(`/projects/${projectId}/preview`), {
          waitUntil: "domcontentloaded",
        });
        return;
      }

      if (!clickedVideo) {
        clickedVideo = await tryClickFirstVideoSuggestion(page);
        if (clickedVideo) {
          await page.waitForTimeout(1500);
          continue;
        }
      }

      const chipSection = page.locator("text=바로 답하기").locator("..");
      const chips = chipSection.locator("button");
      const chipCount = await chips.count().catch(() => 0);
      if (chipCount > 0) {
        await chips.first().click();
        await page.waitForTimeout(800);
        continue;
      }

      const input = page.locator("#chat-input");
      const sendBtn = page.getByRole("button", { name: "전송" });
      if (await input.isVisible().catch(() => false)) {
        const preparing = await page
          .getByText("첫 질문을 준비하고 있어요")
          .isVisible()
          .catch(() => false);
        const canSend =
          !preparing && (await sendBtn.isEnabled().catch(() => false));
        if (canSend) {
          await input.fill(
            "가장 기억에 남는 건 따뜻한 조명 아래에서 나눈 대화예요. 차분한 톤으로 정리해 주세요.",
          );
          await sendBtn.click();
        }
      }

      await page.waitForTimeout(1200);
      continue;
    }

    await page.waitForTimeout(400);
  }

  throw new Error(
    `개인화→미리보기 타임아웃 (${maxMs}ms), 현재 URL: ${page.url()}`,
  );
}

async function previewThroughShipping(page, projectId) {
  await page.getByRole("heading", { name: "포토북 미리보기" }).waitFor({
    timeout: 30_000,
  });

  const makeBook = page.getByRole("button", { name: "포토북 만들기" });
  const finalizeBtn = page.getByRole("button", { name: "인쇄용으로 확정하기" });

  await Promise.race([
    makeBook.waitFor({ state: "visible", timeout: 25_000 }),
    finalizeBtn.waitFor({ state: "visible", timeout: 25_000 }),
  ]).catch(() => {});

  if (await makeBook.isVisible().catch(() => false)) {
    await makeBook.click();
  }

  const genDeadline = Date.now() + 360_000;
  while (Date.now() < genDeadline) {
    if (await finalizeBtn.isVisible().catch(() => false)) {
      break;
    }
    const err = page.locator("p.text-red-600").first();
    if (await err.isVisible().catch(() => false)) {
      const t = (await err.textContent())?.trim() ?? "";
      throw new Error(`미리보기 오류: ${t || "(내용 없음)"}`);
    }
    await page.waitForTimeout(1500);
  }

  if (!(await finalizeBtn.isVisible().catch(() => false))) {
    const labels = await page
      .locator("aside .editorial-card button")
      .allTextContents();
    throw new Error(
      `인쇄 확정 버튼 미노출(6분 대기). aside 버튼: ${JSON.stringify(labels)}`,
    );
  }
  await finalizeBtn.click({ timeout: 120_000 });

  await page.getByRole("button", { name: "배송 · 결제로 이동" }).click({
    timeout: 60_000,
  });

  await page.waitForURL(new RegExp(`/projects/${projectId}/shipping`), {
    timeout: 30_000,
  });
  await page.getByText("어디로 보내드릴까요?").waitFor({ timeout: 20_000 });
}

async function shippingEstimateAndPaymentUi(page) {
  async function fillAndConfirm(locator, value, label) {
    await locator.waitFor({ state: "visible", timeout: 15_000 });
    for (let attempt = 0; attempt < 3; attempt++) {
      await locator.click({ force: true });
      await locator.fill("");
      await locator.type(value, { delay: 40 });
      await locator.evaluate((input) => input.blur());
      await page.waitForTimeout(150);

      const current = await locator.inputValue().catch(() => "");
      if (current === value) {
        return;
      }
    }

    const current = await locator.inputValue().catch(() => "");
    throw new Error(`${label} 입력값 반영 실패: expected=${value}, actual=${current}`);
  }

  await page
    .locator('[data-route-transition-state="idle"]')
    .first()
    .waitFor({ state: "attached", timeout: 25_000 })
    .catch(() => {});
  await page.waitForTimeout(800);

  const shippingInputs = page.locator("section .grid input.editorial-input");
  const recipientName = shippingInputs.nth(0);
  const recipientPhone = shippingInputs.nth(1);
  const address1 = shippingInputs.nth(2);
  const postalCode = shippingInputs.nth(3);

  await fillAndConfirm(recipientName, "E2E 수령인", "받는 분");
  await fillAndConfirm(recipientPhone, "01012345678", "연락처");
  await fillAndConfirm(address1, "서울특별시 중구 세종대로 110", "주소");
  await fillAndConfirm(postalCode, "04524", "우편번호");

  const qty = shippingInputs.nth(5);
  if (await qty.isVisible().catch(() => false)) {
    await fillAndConfirm(qty, "1", "수량");
  }

  const estimateBtn = page.getByRole("button", { name: "예상 금액 확인" });
  for (let i = 0; i < 60; i++) {
    if (await estimateBtn.isEnabled().catch(() => false)) {
      break;
    }
    await page.waitForTimeout(200);
  }
  if (!(await estimateBtn.isEnabled().catch(() => false))) {
    const invalidMessages = await page.locator("p.text-red-600").allTextContents();
    throw new Error(
      `견적 버튼 비활성 유지: ${JSON.stringify({
        recipientName: await recipientName.inputValue().catch(() => ""),
        recipientPhone: await recipientPhone.inputValue().catch(() => ""),
        address1: await address1.inputValue().catch(() => ""),
        postalCode: await postalCode.inputValue().catch(() => ""),
        invalidMessages,
      })}`,
    );
  }
  await estimateBtn.click({ force: true, timeout: 15_000 });

  await page
    .getByRole("button", { name: "계산 중..." })
    .waitFor({ state: "detached", timeout: 120_000 })
    .catch(() => {});

  const payPrep = page.getByRole("button", { name: "결제 진행하기" });
  const errLine = page.locator("section p.text-red-600").first();

  for (let i = 0; i < 600; i++) {
    if (await payPrep.isVisible().catch(() => false)) {
      break;
    }
    if (await errLine.isVisible().catch(() => false)) {
      const t = (await errLine.textContent())?.trim() ?? "";
      throw new Error(
        `견적/배송 오류: ${t} / form=${JSON.stringify({
          recipientName: await recipientName.inputValue().catch(() => ""),
          recipientPhone: await recipientPhone.inputValue().catch(() => ""),
          address1: await address1.inputValue().catch(() => ""),
          postalCode: await postalCode.inputValue().catch(() => ""),
        })}`,
      );
    }
    await page.waitForTimeout(200);
  }

  await payPrep.waitFor({ state: "visible", timeout: 5000 });
  await payPrep.click({ force: true });

  const orderBtn = page.getByRole("button", { name: "주문 확정하기" });
  const tossBtn = page.getByRole("button", { name: "토스로 결제하기" });

  await Promise.race([
    orderBtn.waitFor({ state: "visible", timeout: 90_000 }),
    tossBtn.waitFor({ state: "visible", timeout: 90_000 }),
  ]);

  if (await orderBtn.isVisible().catch(() => false)) {
    await orderBtn.click();
    await page.waitForURL(/\/complete/, { timeout: 90_000 });
    await page.getByText("주문 완료").first().waitFor({ timeout: 20_000 });
    return "order-without-toss";
  }

  if (await tossBtn.isVisible().catch(() => false)) {
    log("토스 결제 버튼 노출(실결제는 생략)");
    return "toss-ready";
  }

  return "payment-ui-partial";
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  async function step(name, fn) {
    try {
      const r = await fn();
      log("OK", name, r !== undefined ? `→ ${r}` : "");
    } catch (e) {
      const msg = e?.message || String(e);
      failures.push({ name, msg });
      log("FAIL", name, msg);
    }
  }

  await step("회원가입(팬) → 미리보기·(가능 시)주문", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      baseURL: BASE,
    });
    try {
      const page = await ctx.newPage();
      const stamp = Date.now();
      const email = `e2e-fan-${stamp}@playpick-e2e.local`;
      await signupFan(page, {
        email,
        password: "E2ETestPass9!",
        displayName: `E2E Fan ${stamp}`,
      });

      const res = await page.request.get(`${BASE}/api/editions`);
      assert(res.ok(), `editions ${res.status()}`);
      const editions = await res.json();
      const editionId = editions[0]?.id;
      assert(editionId, "edition id");

      const created = await createProjectViaApi(page.request, "demo");
      const projectId = created.projectId;
      assert(projectId, "project id in response");
      await page.goto(appUrl(`/projects/${projectId}/personalize`), {
        waitUntil: "domcontentloaded",
      });

      await page.getByText("LLM 개인화 인터뷰").first().waitFor({ timeout: 30_000 });
      await drivePersonalizationToPreview(page, projectId, { maxMs: 280_000 });
      await page.waitForURL(/\/preview/, { timeout: 120_000 });
      await page.getByRole("heading", { name: "포토북 미리보기" }).waitFor({
        timeout: 15_000,
      });

      let outcome = "preview-only";
      try {
        await previewThroughShipping(page, projectId);
        outcome = await shippingEstimateAndPaymentUi(page);

        if (outcome === "order-without-toss") {
          await page.goto(
            appUrl(`/projects/${projectId}/payment/success?paymentKey=x&orderId=x&amount=1`),
            { waitUntil: "domcontentloaded" },
          );
          await page.getByText(/누락|승인|실패|오류/i).first().waitFor({
            timeout: 15_000,
          });
        }
      } catch (e) {
        const msg = e?.message || String(e);
        const sweetbookEnv =
          /Sweetbook|sweetbook|인쇄 확정 버튼 미노출/i.test(msg) &&
          !E2E_STRICT;
        if (!sweetbookEnv) {
          throw e;
        }
        log(
          "WARN",
          "Sweetbook/배송 단계 생략(로컬 연동 또는 생성 지연). E2E_STRICT=1이면 실패 처리됩니다.",
          msg,
        );
        outcome = `preview-only — ${msg.slice(0, 120)}`;
      }

      return `${projectId} / ${outcome}`;
    } finally {
      await ctx.close();
    }
  });

  await step("결제 실패 페이지(쿼리 없음)", async () => {
    const ctx = await browser.newContext({ baseURL: BASE });
    try {
      const page = await ctx.newPage();
      await login(page, "fan@playpick.local", "Fan12345!");
      await page.goto(
        appUrl("/projects/1/payment/fail?code=USER_CANCEL&message=e2e-test"),
        {
        waitUntil: "domcontentloaded",
        },
      );
      await page.waitForFunction(
        () => document.body.innerText.includes("결제가 완료되지 않았습니다"),
        null,
        {
        timeout: 15_000,
        },
      );
    } finally {
      await ctx.close();
    }
  });

  await browser.close();

  if (failures.length) {
    console.error("\n--- 실패 ---");
    for (const f of failures) console.error(f.name, "->", f.msg);
    process.exit(1);
  }
  log("전체 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
