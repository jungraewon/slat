// ==========================================
// NOVA 스마트폰 구매 실험
// script.js
// ==========================================


// ==========================================
// 1. 상품 데이터
// ==========================================
import "./style.css";

const products = {
  A: {
    id: "A",
    name: "NOVA S1",
    price: 699000,

    specs: {
      display: "6.5인치",
      storage: "128GB",
      camera: "50MP"
    },

    infoType: "리뷰",

    durability: 4,

    rating: null,

    reviews: [
      "사용하기 편하고 전체적으로 만족스러워요.",
      "가격을 생각하면 괜찮은 제품인 것 같아요.",
      "디자인이 깔끔해서 마음에 들어요."
    ]
  },

  B: {
    id: "B",
    name: "NOVA S2",
    price: 699000,

    specs: {
      display: "6.5인치",
      storage: "128GB",
      camera: "50MP"
    },

    infoType: "별점",

    durability: 2,

    rating: 4.2,

    reviews: []
  },

  C: {
    id: "C",
    name: "NOVA S3",
    price: 699000,

    specs: {
      display: "6.5인치",
      storage: "128GB",
      camera: "50MP"
    },

    infoType: "내구성",

    durability: 5,

    rating: null,

    reviews: []
  },

  D: {
    id: "D",
    name: "NOVA S4",
    price: 699000,

    specs: {
      display: "6.5인치",
      storage: "128GB",
      camera: "50MP"
    },

    infoType: "리뷰 + 별점",

    durability: 3,

    rating: 4.5,

    reviews: [
      "전체적으로 안정적인 느낌이에요.",
      "화면이 선명하고 사용하기 편합니다.",
      "일상적으로 사용하기에는 충분한 것 같아요."
    ]
  },

  E: {
    id: "E",
    name: "NOVA S5",
    price: 699000,

    specs: {
      display: "6.5인치",
      storage: "128GB",
      camera: "50MP"
    },

    infoType: "리뷰 + 별점 + 내구성",

    durability: 4,

    rating: 4.7,

    reviews: [
      "전체적으로 만족도가 높은 제품입니다.",
      "사용하면서 특별히 불편한 점은 없었어요.",
      "가격 대비 괜찮은 선택이라고 생각합니다."
    ]
  }
};


// ==========================================
// 2. 실험 변수
// ==========================================

let participantId = generateParticipantId();

let experimentStarted = false;
let experimentStartTime = null;

let currentProduct = null;
let finalChoice = null;

let detailVisited = {
  A: false,
  B: false,
  C: false,
  D: false,
  E: false
};


// ==========================================
// 3. 참가자 ID 생성
// ==========================================

function generateParticipantId() {
  const time = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return "P-" + time + "-" + random;
}


// ==========================================
// 4. HTML 요소 가져오기
// ==========================================

const startScreen = document.getElementById("startScreen");
const shopScreen = document.getElementById("shopScreen");
const detailScreen = document.getElementById("detailScreen");
const completeScreen = document.getElementById("completeScreen");

const startButton = document.getElementById("startButton");

const productGrid = document.getElementById("productGrid");

const backButton = document.getElementById("backButton");

const detailContainer =
  document.getElementById("detailContainer");

const confirmModal =
  document.getElementById("confirmModal");

const cancelButton =
  document.getElementById("cancelButton");

const closeModal =
  document.getElementById("closeModal");

const confirmButton =
  document.getElementById("confirmButton");


// ==========================================
// 5. 화면 전환
// ==========================================

function showScreen(screen) {

  const screens = [
    startScreen,
    shopScreen,
    detailScreen,
    completeScreen
  ];

  screens.forEach(function(item) {

    if (item) {
      item.classList.add("hidden");
    }

  });

  if (screen) {
    screen.classList.remove("hidden");
  }

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}


// ==========================================
// 6. 모달 열기 / 닫기
// ==========================================

function openModal() {

  if (!confirmModal) {
    return;
  }

  confirmModal.classList.remove("hidden");
}


function closeConfirmModal() {

  if (!confirmModal) {
    return;
  }

  confirmModal.classList.add("hidden");
}


// ==========================================
// 7. 실험 시작
// ==========================================

function startExperiment() {

  experimentStarted = true;

  experimentStartTime = Date.now();

  showScreen(shopScreen);

  renderProducts();
}


if (startButton) {

  startButton.addEventListener(
    "click",
    startExperiment
  );

}


// ==========================================
// 8. 상품 카드 만들기
// ==========================================

function renderProducts() {

  if (!productGrid) {
    return;
  }

  productGrid.innerHTML = "";

  Object.values(products).forEach(function(product) {

    const card = document.createElement("article");

    card.className = "product-card";

    card.innerHTML = `

      <div class="product-image">

        <div class="phone-mockup">

          <div class="phone-screen">
            NOVA
          </div>

        </div>

      </div>

      <div class="product-content">

        <div class="product-brand">
          NOVA
        </div>

        <h3 class="product-name">
          ${product.name}
        </h3>

        <p class="product-spec">
          ${product.specs.display}
          ·
          ${product.specs.storage}
          ·
          ${product.specs.camera}
        </p>

        <p class="product-price">
          ${product.price.toLocaleString()}원
        </p>

        <button
          class="detail-button"
          data-product-id="${product.id}"
        >
          상품 자세히 보기
        </button>

      </div>

    `;

    productGrid.appendChild(card);

  });


  // 상세보기 버튼 이벤트

  const detailButtons =
    document.querySelectorAll(".detail-button");


  detailButtons.forEach(function(button) {

    button.addEventListener(
      "click",
      function() {

        const productId =
          button.dataset.productId;

        openProductDetail(productId);

      }
    );

  });

}


// ==========================================
// 9. 상품 상세 페이지
// ==========================================

function openProductDetail(productId) {

  const product = products[productId];

  if (!product) {
    return;
  }

  currentProduct = productId;

  // 상세 페이지 방문 기록
  detailVisited[productId] = true;

  renderDetailPage(product);

  showScreen(detailScreen);
}


// ==========================================
// 10. 상세 페이지 만들기
// ==========================================

function renderDetailPage(product) {

  if (!detailContainer) {
    return;
  }

  let html = "";


  // ----------------------------------------
  // 상품 기본 정보
  // ----------------------------------------

  html += `

    <div class="detail-product">

      <div class="product-image detail-image">

        <div class="phone-mockup">

          <div class="phone-screen">
            NOVA
          </div>

        </div>

      </div>

      <div class="detail-basic">

        <div class="product-brand">
          NOVA
        </div>

        <h1>
          ${product.name}
        </h1>

        <div class="detail-price">
          ${product.price.toLocaleString()}원
        </div>

        <div class="detail-specs">

          <div>
            <span>디스플레이</span>
            <strong>${product.specs.display}</strong>
          </div>

          <div>
            <span>저장공간</span>
            <strong>${product.specs.storage}</strong>
          </div>

          <div>
            <span>카메라</span>
            <strong>${product.specs.camera}</strong>
          </div>

        </div>

      </div>

    </div>

  `;


  // ----------------------------------------
  // 리뷰
  // ----------------------------------------

  if (
    product.infoType.includes("리뷰") &&
    product.reviews.length > 0
  ) {

    html += `

      <section class="detail-section">

        <h2>구매자 리뷰</h2>

        <div class="review-list">

          ${product.reviews.map(function(review) {

            return `

              <div class="review-item">

                <div class="review-stars">
                  ★★★★★
                </div>

                <p>
                  ${review}
                </p>

              </div>

            `;

          }).join("")}

        </div>

      </section>

    `;

  }


  // ----------------------------------------
  // 별점
  // ----------------------------------------

  if (
    product.infoType.includes("별점") &&
    product.rating !== null
  ) {

    html += `

      <section class="detail-section">

        <h2>사용자 평점</h2>

        <div class="rating-box">

          <strong>
            ${product.rating}
          </strong>

          <span>
            / 5.0
          </span>

        </div>

      </section>

    `;

  }


  // ----------------------------------------
  // 내구성
  // ----------------------------------------

  if (
    product.infoType.includes("내구성")
  ) {

    html += `

      <section class="detail-section">

        <h2>제품 내구성</h2>

        <div class="durability-box">

          <div class="durability-score">

            <strong>
              ${product.durability}/5
            </strong>

          </div>

          <div class="durability-bar">

            <div
              class="durability-fill"
              style="width: ${product.durability * 20}%"
            ></div>

          </div>

          <p>
            제품의 내구성을 5단계로 표시한 정보입니다.
          </p>

        </div>

      </section>

    `;

  }


  // ----------------------------------------
  // 선택 버튼
  // ----------------------------------------

  html += `

    <div class="detail-action">

      <button
        class="select-product-button primary-button"
        data-product-id="${product.id}"
      >
        이 상품 선택하기
      </button>

    </div>

  `;


  detailContainer.innerHTML = html;


  // 선택 버튼 이벤트

  const selectButton =
    detailContainer.querySelector(
      ".select-product-button"
    );


  if (selectButton) {

    selectButton.addEventListener(
      "click",
      function() {

        currentProduct =
          selectButton.dataset.productId;

        openModal();

      }
    );

  }

}


// ==========================================
// 11. 상품 목록으로 돌아가기
// ==========================================

if (backButton) {

  backButton.addEventListener(
    "click",
    function() {

      currentProduct = null;

      closeConfirmModal();

      showScreen(shopScreen);

    }
  );

}


// ==========================================
// 12. 취소 버튼
// ==========================================

if (cancelButton) {

  cancelButton.addEventListener(
    "click",
    function() {

      closeConfirmModal();

    }
  );

}


// ==========================================
// 13. 모달 X 버튼
// ==========================================

if (closeModal) {

  closeModal.addEventListener(
    "click",
    function() {

      closeConfirmModal();

    }
  );

}


// ==========================================
// 14. 모달 바깥 클릭
// ==========================================

if (confirmModal) {

  confirmModal.addEventListener(
    "click",
    function(event) {

      if (event.target === confirmModal) {

        closeConfirmModal();

      }

    }
  );

}


// ==========================================
// 15. 최종 선택
// ==========================================

if (confirmButton) {

  confirmButton.addEventListener(
    "click",
    function() {

      if (!currentProduct) {
        return;
      }

      finalChoice = currentProduct;


      // 결정까지 걸린 시간
      const decisionTime = Math.round(
        (Date.now() - experimentStartTime) / 1000
      );


      // 최종 실험 데이터

      const experimentData = {

        participant_id: participantId,

        final_choice: finalChoice,

        A_detail_visited: detailVisited.A,

        B_detail_visited: detailVisited.B,

        C_detail_visited: detailVisited.C,

        D_detail_visited: detailVisited.D,

        E_detail_visited: detailVisited.E,

        decision_time: decisionTime,

        created_at:
          new Date().toISOString()

      };


      // 현재는 콘솔에 저장
      // 추후 Supabase 연결

      console.log(
        "===== 실험 결과 ====="
      );

      console.log(
        experimentData
      );


      console.log(
        JSON.stringify(
          experimentData,
          null,
          2
        )
      );


      closeConfirmModal();

      showScreen(completeScreen);

    }
  );

}


// ==========================================
// 16. 페이지 처음 열었을 때
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    // 시작 화면만 표시
    showScreen(startScreen);

    // 혹시 모달이 보이는 경우 강제로 숨김
    closeConfirmModal();

  }
);
