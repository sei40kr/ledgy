import type { AccountTitleCategory } from "../models/accountTitle";

export interface AccountTitlePreset {
  name: string;
  category: AccountTitleCategory;
  /** The name in Hepburn romanization, so the picker matches it typed without an IME. */
  searchWords: string[];
}

/**
 * Standard chart of accounts for sole proprietors — roughly 50 account titles, based
 * on the blue-return financial statements. Creating a tenant at sign-up seeds
 * the accountTitles collection from this list, numbering sortOrder as array index × 10.
 * AccountTitle names stay Japanese because they are displayed verbatim in the UI; each
 * carries its Hepburn romanization as a search word.
 */
export const STANDARD_ACCOUNT_TITLE_PRESETS: ReadonlyArray<AccountTitlePreset> = [
  // Assets
  { name: "現金", category: "asset", searchWords: ["genkin"] },
  { name: "小口現金", category: "asset", searchWords: ["koguchigenkin"] },
  { name: "当座預金", category: "asset", searchWords: ["tozayokin"] },
  { name: "普通預金", category: "asset", searchWords: ["futsuyokin"] },
  { name: "定期預金", category: "asset", searchWords: ["teikiyokin"] },
  { name: "受取手形", category: "asset", searchWords: ["uketoritegata"] },
  { name: "売掛金", category: "asset", searchWords: ["urikakekin"] },
  { name: "有価証券", category: "asset", searchWords: ["yukashoken"] },
  { name: "商品", category: "asset", searchWords: ["shohin"] },
  { name: "前払金", category: "asset", searchWords: ["maebaraikin"] },
  { name: "貸付金", category: "asset", searchWords: ["kashitsukekin"] },
  { name: "建物", category: "asset", searchWords: ["tatemono"] },
  { name: "建物附属設備", category: "asset", searchWords: ["tatemonofuzokusetsubi"] },
  { name: "機械装置", category: "asset", searchWords: ["kikaisochi"] },
  { name: "車両運搬具", category: "asset", searchWords: ["sharyounpangu"] },
  { name: "工具器具備品", category: "asset", searchWords: ["kogukigubihin"] },
  { name: "土地", category: "asset", searchWords: ["tochi"] },
  { name: "敷金・保証金", category: "asset", searchWords: ["shikikin", "hoshokin"] },
  { name: "事業主貸", category: "asset", searchWords: ["jigyonushikashi"] },
  // Liabilities
  { name: "支払手形", category: "liability", searchWords: ["shiharaitegata"] },
  { name: "買掛金", category: "liability", searchWords: ["kaikakekin"] },
  { name: "借入金", category: "liability", searchWords: ["kariirekin"] },
  { name: "未払金", category: "liability", searchWords: ["mibaraikin"] },
  { name: "前受金", category: "liability", searchWords: ["maeukekin"] },
  { name: "預り金", category: "liability", searchWords: ["azukarikin"] },
  { name: "未払費用", category: "liability", searchWords: ["mibaraihiyo"] },
  { name: "未払消費税等", category: "liability", searchWords: ["mibaraishohizeito"] },
  { name: "事業主借", category: "liability", searchWords: ["jigyonushikari"] },
  // Equity
  { name: "元入金", category: "equity", searchWords: ["motoirekin"] },
  // Revenue
  { name: "売上高", category: "revenue", searchWords: ["uriagedaka"] },
  { name: "家事消費等", category: "revenue", searchWords: ["kajishohito"] },
  { name: "雑収入", category: "revenue", searchWords: ["zatsushunyu"] },
  // Expenses
  { name: "仕入高", category: "expense", searchWords: ["shiiredaka"] },
  { name: "租税公課", category: "expense", searchWords: ["sozeikoka"] },
  { name: "荷造運賃", category: "expense", searchWords: ["nizukuriunchin"] },
  { name: "水道光熱費", category: "expense", searchWords: ["suidokonetsuhi"] },
  { name: "旅費交通費", category: "expense", searchWords: ["ryohikotsuhi"] },
  { name: "通信費", category: "expense", searchWords: ["tsushinhi"] },
  { name: "広告宣伝費", category: "expense", searchWords: ["kokokusendenhi"] },
  { name: "接待交際費", category: "expense", searchWords: ["settaikosaihi"] },
  { name: "損害保険料", category: "expense", searchWords: ["songaihokenryo"] },
  { name: "修繕費", category: "expense", searchWords: ["shuzenhi"] },
  { name: "消耗品費", category: "expense", searchWords: ["shomohinhi"] },
  { name: "減価償却費", category: "expense", searchWords: ["genkashokyakuhi"] },
  { name: "福利厚生費", category: "expense", searchWords: ["fukurikoseihi"] },
  { name: "給料賃金", category: "expense", searchWords: ["kyuryochingin"] },
  { name: "外注工賃", category: "expense", searchWords: ["gaichukochin"] },
  { name: "利子割引料", category: "expense", searchWords: ["rishiwaribikiryo"] },
  { name: "地代家賃", category: "expense", searchWords: ["chidaiyachin"] },
  { name: "貸倒金", category: "expense", searchWords: ["kashidaorekin"] },
  { name: "支払手数料", category: "expense", searchWords: ["shiharaitesuryo"] },
  { name: "車両費", category: "expense", searchWords: ["sharyohi"] },
  { name: "新聞図書費", category: "expense", searchWords: ["shinbuntoshohi"] },
  { name: "会議費", category: "expense", searchWords: ["kaigihi"] },
  { name: "専従者給与", category: "expense", searchWords: ["senjushakyuyo"] },
  { name: "雑費", category: "expense", searchWords: ["zappi"] },
];
