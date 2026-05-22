const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, 'shopping-list.html');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // localStorage 초기화 후 로드
  await page.goto(FILE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  console.log('\n=== 쇼핑 리스트 자동 테스트 (Playwright Chromium) ===\n');

  // ── 1. 초기 상태 ──────────────────────────────────────────
  console.log('📋 [1] 초기 상태 확인');

  assert(await page.locator('#empty-msg').isVisible(), '빈 상태 메시지 표시됨');
  assert(await page.locator('#count').innerText() === '항목 없음', `카운트 = "항목 없음"`);
  assert(await page.locator('#clear-btn').isDisabled(), '"완료 항목 삭제" 버튼 비활성화 상태');

  // ── 2. 아이템 추가 ────────────────────────────────────────
  console.log('\n➕ [2] 아이템 추가 기능');

  await page.fill('#item-input', '사과');
  await page.click('#add-btn');
  assert(await page.locator('.item').count() === 1, '버튼 클릭으로 아이템 1개 추가됨');

  await page.fill('#item-input', '바나나');
  await page.press('#item-input', 'Enter');
  assert(await page.locator('.item').count() === 2, 'Enter 키로 아이템 2개까지 추가됨');

  await page.fill('#item-input', '우유');
  await page.click('#add-btn');
  assert(await page.locator('.item').count() === 3, '아이템 3개까지 추가됨');
  assert(await page.locator('#count').innerText() === '총 3개', '카운트 "총 3개" 표시됨');
  assert(await page.locator('#empty-msg').isHidden(), '아이템 추가 후 빈 상태 메시지 숨겨짐');

  // 공백 입력 무시
  await page.fill('#item-input', '   ');
  await page.click('#add-btn');
  assert(await page.locator('.item').count() === 3, '공백만 입력 시 추가되지 않음');

  // ── 3. 아이템 텍스트 (최신순) ─────────────────────────────
  console.log('\n🔤 [3] 아이템 텍스트 표시 (최신순)');
  const texts = await page.locator('.item-text').allInnerTexts();
  assert(texts[0] === '우유',   `첫 번째(최신) = "${texts[0]}"`);
  assert(texts[1] === '바나나', `두 번째 = "${texts[1]}"`);
  assert(texts[2] === '사과',   `세 번째 = "${texts[2]}"`);

  // ── 4. 체크 기능 ──────────────────────────────────────────
  console.log('\n✔️  [4] 체크 기능');

  await page.locator('.item input[type="checkbox"]').first().check();
  assert(
    await page.locator('.item').first().evaluate(el => el.classList.contains('checked')),
    '체크 시 .checked 클래스 추가됨'
  );
  assert(
    await page.locator('.item-text').first().evaluate(el =>
      getComputedStyle(el).textDecoration.includes('line-through')
    ),
    '체크된 항목에 취소선 적용됨'
  );
  assert(await page.locator('#checked-count').innerText() === '1/3 완료', '완료 카운트 "1/3 완료"');
  assert(await page.locator('#clear-btn').isEnabled(), '"완료 항목 삭제" 버튼 활성화됨');

  // 체크 해제
  await page.locator('.item input[type="checkbox"]').first().uncheck();
  assert(
    await page.locator('.item').first().evaluate(el => !el.classList.contains('checked')),
    '체크 해제 시 .checked 클래스 제거됨'
  );

  // ── 5. 아이템 삭제 ────────────────────────────────────────
  console.log('\n🗑️  [5] 아이템 삭제 기능');

  await page.locator('.delete-btn').nth(1).click(); // 바나나 삭제
  assert(await page.locator('.item').count() === 2, '삭제 후 2개 남음');
  const remainTexts = await page.locator('.item-text').allInnerTexts();
  assert(!remainTexts.includes('바나나'), '"바나나" 목록에서 제거됨');
  assert(await page.locator('#count').innerText() === '총 2개', '삭제 후 카운트 "총 2개"');

  // ── 6. 완료 항목 일괄 삭제 ───────────────────────────────
  console.log('\n🧹 [6] 완료 항목 일괄 삭제');

  await page.locator('.item input[type="checkbox"]').nth(0).check();
  await page.locator('.item input[type="checkbox"]').nth(1).check();
  await page.click('#clear-btn');
  assert(await page.locator('.item').count() === 0, '완료 항목 모두 삭제됨');
  assert(await page.locator('#empty-msg').isVisible(), '모두 삭제 후 빈 상태 메시지 다시 표시됨');

  // ── 7. localStorage 지속성 (실제 새로고침) ───────────────
  console.log('\n💾 [7] 새로고침 후 데이터 유지 (localStorage)');

  await page.fill('#item-input', '달걀');
  await page.click('#add-btn');
  await page.fill('#item-input', '치즈');
  await page.click('#add-btn');
  await page.locator('.item input[type="checkbox"]').first().check();

  await page.reload();

  assert(await page.locator('.item').count() === 2, '새로고침 후 2개 아이템 복원됨');
  assert(await page.locator('.item.checked').count() === 1, '새로고침 후 체크 상태 복원됨');

  // ── 8. XSS 방어 ──────────────────────────────────────────
  console.log('\n🔒 [8] XSS 방어 (HTML 이스케이프)');

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.fill('#item-input', '<script>alert("xss")</script>');
  await page.click('#add-btn');
  const itemHTML = await page.locator('.item-text').first().innerHTML();
  assert(!itemHTML.includes('<script>'), 'script 태그가 이스케이프 처리됨');

  // ── 결과 ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`결과: ${passed}개 통과 / ${failed}개 실패 / 총 ${passed + failed}개`);
  if (failed === 0) {
    console.log('🎉 모든 테스트를 통과했습니다!');
  } else {
    console.log('⚠️  일부 테스트가 실패했습니다. 위 결과를 확인하세요.');
  }
  console.log('═'.repeat(50) + '\n');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();