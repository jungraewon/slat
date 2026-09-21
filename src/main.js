import "./style.css";
import { supabase } from "./supabase.js";

// ======================================================
// INSITE 스마트폰 구매 실험
// ======================================================
// A / IN S1 : 리뷰
// B / IN S2 : 별점
// C / IN S3 : 사양 + 내구성
// D / IN S4 : 리뷰 + 별점
// E / IN S5 : 리뷰 + 사양 + 내구성
// F / IN S6 : 별점 + 사양 + 내구성
// G / IN S7 : 리뷰 + 별점 + 사양 + 내구성
//
// 모든 상품의 실제 정보값은 동일하다.
// 차이는 어떤 정보를 보여주는가뿐이다.
// ======================================================


// ======================================================
// 상품 데이터
// ======================================================

const products = {
  A: {
    id: "A",
    name: "IN S1",
    price: 699000,
    discountRate: 32,
    showReviews: true,
    showRating: false,
    showSpecs: false
  },

  B: {
    id: "B",
    name: "IN S2",
    price: 699000,
    discountRate: 30,
    showReviews: false,
    showRating: true,
    showSpecs: false
  },

  C: {
    id: "C",
    name: "IN S3",
    price: 699000,
    discountRate: 29,
    showReviews: false,
    showRating: false,
    showSpecs: true
  },

  D: {
    id: "D",
    name: "IN S4",
    price: 699000,
    discountRate: 30,
    showReviews: true,
    showRating: true,
    showSpecs: false
  },

  E: {
    id: "E",
    name: "IN S5",
    price: 699000,
    discountRate: 31,
    showReviews: true,
    showRating: false,
    showSpecs: true
  },

  F: {
    id: "F",
    name: "IN S6",
    price: 699000,
    discountRate: 28,
    showReviews: false,
    showRating: true,
    showSpecs: true
  },

  G: {
    id: "G",
    name: "IN S7",
    price: 699000,
    discountRate: 27,
    showReviews: true,
    showRating: true,
    showSpecs: true
  }
};


// ======================================================
// 할인 정가 계산
// ======================================================

function getOriginalPrice(product) {
  return Math.round(
    product.price / (1 - product.discountRate / 100)
  );
}


// ======================================================
// 공통 실제 정보
// ======================================================

const commonInfo = {
  rating: 4.5,

  durability: 4,

  specs: {
    display: "6.5인치",
    storage: "128GB",
    camera: "50MP"
  },

  reviews: [
    "전체적으로 만족도가 높은 제품입니다.",
    "사용하면서 특별히 불편한 점은 없었어요.",
    "가격 대비 괜찮은 선택이라고 생각합니다."
  ]
};


// ======================================================
// 참가자 ID
// ======================================================

function generateParticipantId() {
  return (
    "P-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 7).toUpperCase()
  );
}

let participantId = generateParticipantId();


// ======================================================
// 실험 상태
// ======================================================

let experimentStartTime = null;
let selectedProductId = null;
let experimentRowId = null;


// ======================================================
// 상세페이지 방문 여부
// ======================================================

let detailVisited = {
  A: false,
  B: false,
  C: false,
  D: false,
  E: false,
  F: false,
  G: false
};


// ======================================================
// 상세페이지 조회 횟수
// ======================================================

let detailViews = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  E: 0,
  F: 0,
  G: 0
};


// ======================================================
// 상세페이지 조회 순서
// ======================================================

let detailViewSequence = [];


// ======================================================
// DOM
// ======================================================

const startScreen = document.getElementById("startScreen");
const shopScreen = document.getElementById("shopScreen");
const detailScreen = document.getElementById("detailScreen");
const completeScreen = document.getElementById("completeScreen");

const startButton = document.getElementById("startButton");
const productGrid = document.getElementById("productGrid");

const backButton = document.getElementById("backButton");
const detailContainer = document.getElementById("detailContainer");

const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const cancelButton = document.getElementById("cancelButton");
const closeModalButton = document.getElementById("closeModal");
const confirmButton = document.getElementById("confirmButton");


// ======================================================
// 화면 전환
// ======================================================

function showScreen(screenToShow) {
  const screens = [
    startScreen,
    shopScreen,
    detailScreen,
    completeScreen
  ];

  screens.forEach((screen) => {
    if (!screen) return;

    screen.classList.add("hidden");
  });

  if (screenToShow) {
    screenToShow.classList.remove("hidden");
  }
}


// ======================================================
// 실험 상태 초기화
// ======================================================

function resetExperimentState() {
  selectedProductId = null;
  experimentRowId = null;

  detailVisited = {
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
    F: false,
    G: false
  };

  detailViews = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    G: 0
  };

  detailViewSequence = [];
}


// ======================================================
// 실험 시작
// ======================================================

async function startExperiment() {
  resetExperimentState();

  experimentStartTime = Date.now();
  participantId = generateParticipantId();

  console.log("INSITE 실험 시작");
  console.log("참가자 ID:", participantId);

  const startData = {
    participant_id: participantId,

    final_choice: null,

    status: "started",

    started_at: new Date().toISOString(),

    completed_at: null,

    a_detail_visited: false,
    b_detail_visited: false,
    c_detail_visited: false,
    d_detail_visited: false,
    e_detail_visited: false,
    f_detail_visited: false,
    g_detail_visited: false,

    a_detail_views: 0,
    b_detail_views: 0,
    c_detail_views: 0,
    d_detail_views: 0,
    e_detail_views: 0,
    f_detail_views: 0,
    g_detail_views: 0,

    detail_view_sequence: [],

    decision_time: 0
  };

  const { data, error } = await supabase
    .from("experiment_data")
    .insert(startData)
    .select("id")
    .single();

  if (error) {
    console.error(
      "실험 시작 데이터 저장 실패:",
      error
    );

    alert(
      "실험을 시작할 수 없습니다.\n\n" +
      "데이터베이스 연결 상태를 확인해주세요."
    );

    return;
  }

  experimentRowId = data.id;

  console.log(
    "실험 시작 데이터 저장 완료"
  );

  renderProductList();

  showScreen(shopScreen);

  window.scrollTo(0, 0);
}


// ======================================================
// 상품 목록
// ======================================================

function renderProductList() {
  if (!productGrid) return;

  productGrid.innerHTML = "";

  Object.values(products).forEach((product) => {
    const card = document.createElement("article");

    card.className = "product-card";

    const originalPrice = getOriginalPrice(product);

    card.innerHTML = `
      <div class="product-image-area">

        <div class="product-badge">
          ${product.discountRate}% 할인
        </div>

        <div class="phone">
          <div class="phone-screen">
            INSITE
          </div>

          <div class="phone-camera"></div>
        </div>

      </div>

      <div class="product-info">

        <div class="brand-small">
          INSITE
        </div>

        <h3>
          ${product.name}
        </h3>

        <div class="discount-info">

          <span class="discount-rate">
            ${product.discountRate}%
          </span>

          <span class="original-price">
            ${originalPrice.toLocaleString("ko-KR")}원
          </span>

        </div>

        <div class="price">
          ${product.price.toLocaleString("ko-KR")}원
        </div>

        ${
          product.showRating
            ? `
              <div class="product-rating">

                <span class="rating-star">
                  ★
                </span>

                <strong>
                  ${commonInfo.rating}
                </strong>

                <span class="rating-total">
                  / 5.0
                </span>

              </div>
            `
            : ""
        }

        ${
          product.showSpecs
            ? `
              <div class="stock-notice">

                <span class="stock-icon">
                  ◆
                </span>

                <strong>
                  수량 9개 남음!!
                </strong>

              </div>
            `
            : ""
        }

        <button
          type="button"
          class="button button-primary detail-button"
          data-product-id="${product.id}"
        >
          상품 자세히 보기
          <span class="button-arrow">›</span>
        </button>

      </div>
    `;

    productGrid.appendChild(card);
  });


  const detailButtons =
    productGrid.querySelectorAll(
      ".detail-button"
    );


  detailButtons.forEach((button) => {

    button.addEventListener(
      "click",
      async () => {

        const productId =
          button.dataset.productId;

        await openProductDetail(
          productId
        );

      }
    );

  });
}


// ======================================================
// 상세페이지 조회 DB 저장
// ======================================================

async function saveDetailView(productId) {

  if (!experimentRowId) {

    console.error(
      "experimentRowId가 없습니다."
    );

    return false;
  }


  const lowerId =
    productId.toLowerCase();


  detailViews[productId] += 1;

  detailVisited[productId] =
    true;


  detailViewSequence.push(
    productId
  );


  const updateData = {

    [`${lowerId}_detail_visited`]:
      true,

    [`${lowerId}_detail_views`]:
      detailViews[productId],

    detail_view_sequence: [
      ...detailViewSequence
    ]

  };


  const { error } =
    await supabase

      .from(
        "experiment_data"
      )

      .update(
        updateData
      )

      .eq(
        "id",
        experimentRowId
      );


  if (error) {

    console.error(
      `${productId} 조회 기록 저장 실패:`,
      error
    );

    return false;
  }


  return true;
}


// ======================================================
// 상품 상세 열기
// ======================================================

async function openProductDetail(
  productId
) {

  const product =
    products[productId];


  if (!product) {
    return;
  }


  const saved =
    await saveDetailView(
      productId
    );


  if (!saved) {

    alert(
      "상품 조회 기록을 저장하지 못했습니다.\n\n" +
      "잠시 후 다시 시도해주세요."
    );

    return;
  }


  renderProductDetail(
    product
  );


  showScreen(
    detailScreen
  );


  window.scrollTo(
    0,
    0
  );
}


// ======================================================
// 상품 상세페이지
// ======================================================

function renderProductDetail(
  product
) {

  if (!detailContainer) {
    return;
  }


  detailContainer.innerHTML = "";


  const detail =
    document.createElement(
      "div"
    );


  detail.className =
    "detail-card";


  const originalPrice = getOriginalPrice(product);


  let html = `

    <div class="detail-product">

      <div class="detail-phone-area">

        <div class="detail-discount-badge">
          ${product.discountRate}% 할인
        </div>

        <div class="phone large">

          <div class="phone-screen">
            INSITE
          </div>

          <div class="phone-camera"></div>

        </div>

      </div>


      <div class="detail-basic">

        <div class="brand-small">
          INSITE
        </div>

        <h1>
          ${product.name}
        </h1>

        <div class="discount-info detail-discount">

          <span class="discount-rate">
            ${product.discountRate}%
          </span>

          <span class="original-price">
            ${originalPrice.toLocaleString("ko-KR")}원
          </span>

        </div>

        <div class="price large-price">
          ${product.price.toLocaleString("ko-KR")}원
        </div>

        ${
          product.showRating
            ? `
              <div class="product-rating detail-rating">

                <span class="rating-star">
                  ★
                </span>

                <strong>
                  ${commonInfo.rating}
                </strong>

                <span class="rating-total">
                  / 5.0
                </span>

              </div>
            `
            : ""
        }

        ${
          product.showSpecs
            ? `
              <div class="stock-notice detail-stock-notice">

                <span class="stock-icon">
                  ◆
                </span>

                <strong>
                  수량 9개 남음!!
                </strong>

              </div>
            `
            : ""
        }

      </div>

    </div>


    <div class="information-area">

  `;


  // ====================================================
  // 리뷰
  // ====================================================

  if (
    product.showReviews
  ) {

    html += `

      <section
        class="information-section"
      >

        <h2>
          사용자 리뷰
        </h2>


        <div class="review-list">

          ${commonInfo.reviews
            .map(
              (review) => `

                <div class="review">

                  <div class="review-stars">
                    ★★★★★
                  </div>

                  <p>
                    ${review}
                  </p>

                </div>

              `
            )
            .join("")}

        </div>

      </section>

    `;

  }


  // ====================================================
  // 별점
  // ====================================================

  if (
    product.showRating
  ) {

    html += `

      <section
        class="information-section"
      >

        <h2>
          사용자 평점
        </h2>


        <div class="rating">

          <div class="rating-score">

            <span class="rating-number">
              ${commonInfo.rating}
            </span>

            <span class="rating-max">
              / 5.0
            </span>

          </div>


          <div class="rating-stars">
            ★★★★★
          </div>

        </div>

      </section>

    `;

  }


  // ====================================================
  // 사양 + 내구성
  // ====================================================

  if (
    product.showSpecs
  ) {

    html += `

      <section
        class="information-section"
      >

        <h2>
          제품 정보
        </h2>


        <div class="spec-list">

          <div class="spec-row">

            <span>
              디스플레이
            </span>

            <strong>
              ${commonInfo.specs.display}
            </strong>

          </div>


          <div class="spec-row">

            <span>
              저장공간
            </span>

            <strong>
              ${commonInfo.specs.storage}
            </strong>

          </div>


          <div class="spec-row">

            <span>
              카메라
            </span>

            <strong>
              ${commonInfo.specs.camera}
            </strong>

          </div>

        </div>


        <div class="durability">

          <div class="durability-header">

            <span>
              내구성
            </span>

            <strong>
              ${commonInfo.durability} / 5
            </strong>

          </div>


          <div class="durability-bar">

            <div
              class="durability-fill"
              style="
                width:
                ${commonInfo.durability * 20}%
              "
            ></div>

          </div>

        </div>

      </section>

    `;

  }


  // ====================================================
  // 선택 버튼
  // ====================================================

  html += `

      </div>


      <div class="detail-action">

        <button
          type="button"
          id="selectProductButton"
          class="button button-primary select-button"
        >
          이 상품을 선택하기
          <span class="button-arrow">›</span>
        </button>

      </div>

  `;


  detail.innerHTML =
    html;


  detailContainer.appendChild(
    detail
  );


  const selectButton =
    document.getElementById(
      "selectProductButton"
    );


  if (selectButton) {

    selectButton.addEventListener(
      "click",
      () => {

        openConfirmModal(
          product
        );

      }
    );

  }

}


// ======================================================
// 선택 확인 모달
// ======================================================

function openConfirmModal(
  product
) {

  selectedProductId =
    product.id;


  if (confirmTitle) {

    confirmTitle.textContent =
      `${product.name}을(를) 선택하시겠습니까?`;

  }


  if (confirmModal) {

    confirmModal.classList.remove(
      "hidden"
    );

    confirmModal.setAttribute(
      "aria-hidden",
      "false"
    );

  }

}


// ======================================================
// 모달 닫기
// ======================================================

function closeConfirmModal() {

  if (confirmModal) {

    confirmModal.classList.add(
      "hidden"
    );

    confirmModal.setAttribute(
      "aria-hidden",
      "true"
    );

  }

}


// ======================================================
// 최종 선택 데이터 저장
// ======================================================

async function finishExperiment() {

  if (!selectedProductId) {
    return;
  }


  if (!experimentRowId) {

    alert(
      "실험 기록을 찾을 수 없습니다."
    );

    return;
  }


  const decisionTime =
    experimentStartTime

      ? Math.round(
          (
            Date.now() -
            experimentStartTime
          ) / 1000
        )

      : 0;


  const updateData = {

    final_choice:
      selectedProductId,

    status:
      "completed",

    completed_at:
      new Date().toISOString(),

    decision_time:
      decisionTime,


    a_detail_visited:
      detailVisited.A,

    b_detail_visited:
      detailVisited.B,

    c_detail_visited:
      detailVisited.C,

    d_detail_visited:
      detailVisited.D,

    e_detail_visited:
      detailVisited.E,

    f_detail_visited:
      detailVisited.F,

    g_detail_visited:
      detailVisited.G,


    a_detail_views:
      detailViews.A,

    b_detail_views:
      detailViews.B,

    c_detail_views:
      detailViews.C,

    d_detail_views:
      detailViews.D,

    e_detail_views:
      detailViews.E,

    f_detail_views:
      detailViews.F,

    g_detail_views:
      detailViews.G,


    detail_view_sequence: [
      ...detailViewSequence
    ]

  };


  const { error } =
    await supabase

      .from(
        "experiment_data"
      )

      .update(
        updateData
      )

      .eq(
        "id",
        experimentRowId
      );


  if (error) {

    console.error(
      "실험 완료 데이터 저장 실패:",
      error
    );

    alert(
      "실험 데이터를 저장하지 못했습니다.\n\n" +
      "인터넷 연결을 확인한 후 다시 시도해주세요."
    );

    return;
  }


  console.log(
    "INSITE 실험 데이터 저장 완료"
  );


  closeConfirmModal();


  showScreen(
    completeScreen
  );


  window.scrollTo(
    0,
    0
  );

}


// ======================================================
// 이벤트
// ======================================================

if (startButton) {

  startButton.addEventListener(
    "click",
    startExperiment
  );

}


if (backButton) {

  backButton.addEventListener(
    "click",
    () => {

      closeConfirmModal();

      renderProductList();

      showScreen(
        shopScreen
      );

      window.scrollTo(
        0,
        0
      );

    }
  );

}


if (cancelButton) {

  cancelButton.addEventListener(
    "click",
    () => {

      selectedProductId =
        null;

      closeConfirmModal();

    }
  );

}


if (closeModalButton) {

  closeModalButton.addEventListener(
    "click",
    () => {

      selectedProductId =
        null;

      closeConfirmModal();

    }
  );

}


if (confirmModal) {

  confirmModal.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        confirmModal
      ) {

        selectedProductId =
          null;

        closeConfirmModal();

      }

    }
  );

}


if (confirmButton) {

  confirmButton.addEventListener(
    "click",
    finishExperiment
  );

}


// ======================================================
// 초기 상태
// ======================================================

showScreen(
  startScreen
);

closeConfirmModal();

console.log(
  "INSITE 실험 페이지가 정상적으로 실행되었습니다."
);
