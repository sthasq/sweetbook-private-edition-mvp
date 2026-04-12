export function getFieldPlaceholder(fieldKey: string, label: string) {
  switch (fieldKey) {
    case "fanNickname":
      return "예: 연두, 소연, 주은";
    case "subscribedSince":
      return "처음 정주행을 시작한 날짜";
    case "favoriteVideoId":
      return "이번 북의 중심이 될 장면을 골라보세요";
    case "fanNote":
      return "왜 이 장면이 오래 남았는지, 그때 어떤 마음이었는지 적어보세요";
    case "favoriteMemory":
      return "예상 못 한 장면, 따라 하고 싶었던 순간처럼 가장 선명한 기억을 적어보세요";
    case "fanMessage":
      return "크리에이터에게 건네는 편지처럼 자연스럽게 써보세요";
    case "uploadedImageUrl":
      return "같이 넣고 싶은 장면 이미지 주소";
    default:
      return label;
  }
}

export function getFieldHelper(fieldKey: string) {
  switch (fieldKey) {
    case "subscribedSince":
      return "정확한 날짜가 아니어도 괜찮아요. 기억나는 시점만 적어도 분위기가 살아나요.";
    case "favoriteVideoId":
      return "가장 기억에 남는 장면이나 이번 책의 중심이 될 콘텐츠를 떠올리면 좋아요.";
    case "fanNote":
      return "장면 설명보다, 그 장면이 나한테 왜 남았는지를 적으면 더 자연스럽습니다.";
    case "favoriteMemory":
      return "한 줄 감상보다 장면이 떠오르는 묘사를 조금 섞으면 훨씬 사람 같아 보여요.";
    case "fanMessage":
      return "공지 댓글보다 개인 메모처럼 쓰면 이 데모의 결이 더 잘 살아납니다.";
    case "uploadedImageUrl":
      return "실제 업로드 대신 데모용 이미지를 넣어도 괜찮습니다.";
    default:
      return "";
  }
}
