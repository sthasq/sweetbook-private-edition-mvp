const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

export interface TossWidgetsInstance {
  setAmount(amount: { value: number; currency: string }): Promise<void> | void;
  renderPaymentMethods(params: { selector: string; variantKey?: string }): Promise<unknown> | unknown;
  renderAgreement(params: { selector: string; variantKey?: string }): Promise<unknown> | unknown;
  requestPayment(params: {
    orderId: string;
    orderName: string;
    customerEmail?: string;
    customerName?: string;
    customerMobilePhone?: string;
    successUrl: string;
    failUrl: string;
  }): Promise<void> | void;
}

interface TossPaymentsInstance {
  widgets(params: { customerKey: string }): TossWidgetsInstance;
}

type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

let loadingPromise: Promise<TossPaymentsFactory> | null = null;

function readFactory() {
  return (window as Window & { TossPayments?: TossPaymentsFactory }).TossPayments;
}

export function loadTossPayments() {
  const existingFactory = readFactory();
  if (existingFactory) {
    return Promise.resolve(existingFactory);
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise<TossPaymentsFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TOSS_SDK_URL;
    script.async = true;
    script.onload = () => {
      const factory = readFactory();
      if (!factory) {
        loadingPromise = null;
        reject(new Error("토스 SDK를 불러왔지만 초기화 함수를 찾지 못했습니다."));
        return;
      }
      resolve(factory);
    };
    script.onerror = () => {
      loadingPromise = null;
      reject(new Error("토스 SDK를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
}
