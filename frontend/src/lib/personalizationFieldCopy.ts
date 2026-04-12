export function getFieldPlaceholder(fieldKey: string, label: string) {
  switch (fieldKey) {
    case "fanNickname":
      return "예: 연두, 소연, 맑은날의구름";
    case "subscribedSince":
      return "처음으로 설렘을 느꼈던 그날 (예: 2022년 어느 봄날)";
    case "fanNote":
      return "이 장면이 유독 마음에 오래 머물렀던 이유가 있나요?";
    case "favoriteMemory":
      return "우연히 마주친 장면, 혹은 눈물이 핑 돌았던 순간을 자유롭게 적어주세요";
    case "fanMessage":
      return "새벽에 혼자 끄적이는 비밀 편지처럼, 진심을 담아 적어주세요";
    default:
      return label;
  }
}

export function getFieldHelper(fieldKey: string) {
  switch (fieldKey) {
    case "subscribedSince":
      return "정확한 날짜가 아니어도 괜찮아요. '기억나는 그 시점'만 적어도 이야기가 한층 아련해진답니다.";
    case "fanNote":
      return "장면 자체의 설명보다는, '그때 나의 마음'에 집중해 주시면 훨씬 감동적인 글이 완성돼요.";
    case "favoriteMemory":
      return "짧은 감상보다는, 그때의 공기나 감정들이 스며들도록 적어주시면 마법 같은 문장이 나옵니다.";
    case "fanMessage":
      return "형식적인 응원보다는 조금은 투박해도 날것 그대로의 마음을 적어주시면 훨씬 깊은 여운이 남아요.";
    default:
      return "";
  }
}
