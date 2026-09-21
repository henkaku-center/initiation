// ABOUTME: 一言(Signal)の入力欄が、上限と残りの文字数を書き手に見せることを確認する。
// ABOUTME: 上限は140文字。超える前に気づけるようにする(#46 / Issue #119)。
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CheckinButton } from "@/components/CheckinButton";
import { CHECKIN_NOTE_MAX_LENGTH } from "@/lib/domain/checkinNote";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/checkin/actions", () => ({ checkin: vi.fn() }));

describe("CheckinButton", () => {
  it("shows how many characters are left", () => {
    const html = renderToStaticMarkup(createElement(CheckinButton, { checked: true, note: "動いた" }));
    expect(html).toContain(`3 / ${CHECKIN_NOTE_MAX_LENGTH}`);
  });

  it("caps the input at the agreed length", () => {
    const html = renderToStaticMarkup(createElement(CheckinButton, { checked: false, note: null }));
    expect(html).toContain(`maxLength="${CHECKIN_NOTE_MAX_LENGTH}"`);
  });
});
