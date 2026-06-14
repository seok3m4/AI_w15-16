package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AgentTraceStep;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.KoreaImpact;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.MarketSignal;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class EconomyTextCatalog {

	public EconomyMetricSnapshot localizeMetric(EconomyMetricSnapshot metric, SupportedLocale locale) {
		MetricText text = metricText(metric.id(), locale);
		if (text == null) {
			return metric;
		}
		return new EconomyMetricSnapshot(
				metric.id(),
				metric.seriesId(),
				text.name(),
				text.category(),
				metric.value(),
				text.unit(),
				metric.period(),
				metric.baseDate(),
				metric.sourceName(),
				metric.sourceUrl(),
				metric.previousValue(),
				metric.change(),
				metric.changePercent(),
				text.interpretation(),
				metric.updatedAt());
	}

	public List<MarketSignal> marketSignals(
			SupportedLocale locale,
			EconomyMetricSnapshot tenYear,
			EconomyMetricSnapshot fx,
			EconomyMetricSnapshot oil,
			String tenYearState,
			String fxState,
			String oilState) {
		return List.of(
				new MarketSignal(
						"rate-pressure",
						text(locale, "금리", "Rates", "利率", "利率", "金利"),
						tenYearState,
						valueOrPending(tenYear, locale),
						text(
								locale,
								"장기 미국채 금리는 한국 금리와 주식 밸류에이션 압력을 볼 때 먼저 확인합니다.",
								"Watch long-term Treasury yields for pressure on Korean rates and equity valuation.",
								"关注长期美债收益率，它会影响韩国利率和股票估值压力。",
								"關注長期美債殖利率，它會影響韓國利率與股票估值壓力。",
								"長期米国債利回りは、韓国金利と株式評価への圧力を見る時に重要です。")),
				new MarketSignal(
						"dollar-strength",
						"USD/KRW",
						fxState,
						valueOrPending(fx, locale),
						text(
								locale,
								"달러가 강해지면 한국 수입 비용과 환율 민감도가 커질 수 있습니다.",
								"A stronger dollar can raise import costs and increase FX sensitivity.",
								"美元走强可能推高韩国进口成本，并提高汇率敏感度。",
								"美元走強可能推高韓國進口成本，並提高匯率敏感度。",
								"ドル高は韓国の輸入コストを押し上げ、為替感応度を高める可能性があります。")),
				new MarketSignal(
						"commodity-burden",
						"WTI",
						oilState,
						valueOrPending(oil, locale),
						text(
								locale,
								"유가는 에너지 비용과 물가 기대에 바로 연결됩니다.",
								"Oil prices feed into energy costs and inflation expectations.",
								"油价会影响能源成本和通胀预期。",
								"油價會影響能源成本與通膨預期。",
								"原油価格はエネルギーコストとインフレ期待に影響します。")));
	}

	public List<KoreaImpact> koreaImpacts(
			SupportedLocale locale,
			String fxState,
			String exportState,
			String rateState) {
		return List.of(
				new KoreaImpact(
						text(locale, "환율", "FX", "汇率", "匯率", "為替"),
						fxState,
						text(
								locale,
								"USD/KRW와 미국 금리 경로는 한국 수입 비용과 외국인 자금 흐름을 볼 때 첫 확인 지점입니다.",
								"USD/KRW and the U.S. rate path are the first checks for Korean import costs and capital flows.",
								"USD/KRW 和美国利率路径是判断韩国进口成本与外资流向的首要观察点。",
								"USD/KRW 與美國利率路徑是判斷韓國進口成本與外資流向的首要觀察點。",
								"USD/KRW と米国金利の道筋は、韓国の輸入コストと海外資金フローを見る最初の確認点です。"),
						List.of("USD/KRW", "DGS10", "DGS2")),
				new KoreaImpact(
						text(locale, "수출", "Exports", "出口", "出口", "輸出"),
						exportState,
						text(
								locale,
								"미국 소비와 GDP는 자동차, 반도체, 배터리 수요를 판단하는 배경이 됩니다.",
								"U.S. consumption and GDP data help frame demand for autos, semiconductors, and batteries.",
								"美国消费和 GDP 数据有助于判断汽车、半导体和电池需求。",
								"美國消費與 GDP 資料有助於判斷汽車、半導體與電池需求。",
								"米国の消費と GDP は、自動車・半導体・電池需要を見る背景になります。"),
						List.of("RSAFS", "A191RL1Q225SBEA", "SP500")),
				new KoreaImpact(
						text(locale, "금리", "Rates", "利率", "利率", "金利"),
						rateState,
						text(
								locale,
								"미국채 금리는 한국 할인율과 자금 조달 여건으로 번질 수 있습니다.",
								"Treasury yields can spill into Korean discount rates and financing conditions.",
								"美债收益率可能传导到韩国折现率和融资环境。",
								"美債殖利率可能傳導到韓國折現率與融資環境。",
								"米国債利回りは韓国の割引率と資金調達環境に波及する可能性があります。"),
						List.of("DGS10", "DGS2", "PCEPI")));
	}

	public ReportItem reportFor(SupportedLocale locale, EconomyMetricSnapshot metric) {
		return new ReportItem(
				metric.id() + "-fred",
				text(
						locale,
						metric.name() + " 최신 FRED 관측값",
						metric.name() + " latest FRED observation",
						metric.name() + " 最新 FRED 观测值",
						metric.name() + " 最新 FRED 觀測值",
						metric.name() + " 最新 FRED 観測値"),
				metric.category(),
				metric.interpretation(),
				text(
						locale,
						"이 공식 지표 흐름은 투자 조언이 아니라 판단 근거로만 사용합니다.",
						"Use this official-data trend as evidence, not as investment advice.",
						"请将这条官方数据趋势作为判断依据，而不是投资建议。",
						"請將這條官方資料趨勢作為判斷依據，而不是投資建議。",
						"この公式データの流れは投資助言ではなく、判断材料として使います。"),
				List.of(metric.id()),
				metric.sourceName(),
				metric.sourceUrl());
	}

	public List<AgentTraceStep> agentTrace(SupportedLocale locale, String sourceResult) {
		return List.of(
				new AgentTraceStep(
						"series-sync",
						text(
								locale,
								"공식 FRED 관측값을 가져와 PostgreSQL 캐시에 저장합니다.",
								"Fetch official FRED observations and cache them in PostgreSQL.",
								"获取官方 FRED 观测值并缓存到 PostgreSQL。",
								"取得官方 FRED 觀測值並快取到 PostgreSQL。",
								"公式 FRED 観測値を取得し PostgreSQL にキャッシュします。"),
						"source-and-unit-check",
						sourceResult),
				new AgentTraceStep(
						"ai-brief",
						text(
								locale,
								"저장된 지표와 일정만 요약합니다.",
								"Summarize only stored metrics and events.",
								"只总结已保存的指标和日程。",
								"只摘要已儲存的指標與日程。",
								"保存済みの指標とイベントだけを要約します。"),
						"no-unsourced-evidence",
						"pass"),
				new AgentTraceStep(
						"korea-impact",
						text(
								locale,
								"미국 거시 신호를 한국 관점의 점검 축으로 바꿉니다.",
								"Translate U.S. macro signals into Korea-facing watch axes.",
								"将美国宏观信号转换为韩国视角的观察轴。",
								"將美國宏觀訊號轉換為韓國視角的觀察軸。",
								"米国マクロ信号を韓国向けの確認軸に変換します。"),
						"investment-advice-boundary",
						"pass"));
	}

	public EconomicEvent localizeEvent(EconomicEvent event, SupportedLocale locale) {
		return event;
	}

	public String fallbackRisk(SupportedLocale locale, String reason) {
		return reason == null || reason.isBlank()
				? text(locale, "대체 응답이 사용되었습니다.", "Fallback response was used.", "已使用备用回答。", "已使用備用回答。", "代替応答を使用しました。")
				: reason;
	}

	public String pending(SupportedLocale locale) {
		return text(locale, "대기 중", "pending", "等待中", "等待中", "待機中");
	}

	private String valueOrPending(EconomyMetricSnapshot metric, SupportedLocale locale) {
		return metric == null ? pending(locale) : metric.value();
	}

	private MetricText metricText(String id, SupportedLocale locale) {
		return switch (locale) {
			case EN -> metricTextEn(id);
			case ZH_HANS -> metricTextZhHans(id);
			case ZH_HANT -> metricTextZhHant(id);
			case JA -> metricTextJa(id);
			case KO -> metricTextKo(id);
		};
	}

	private MetricText metricTextKo(String id) {
		return switch (id) {
			case "cpi" -> new MetricText("CPI", "물가", "% 전년비", "물가는 Fed 금리 경로와 한국 수입물가 부담을 판단하는 핵심 입력값입니다.");
			case "core-cpi" -> new MetricText("Core CPI", "물가", "% 전년비", "식품과 에너지를 뺀 근원물가는 기초 물가 압력을 보여줍니다.");
			case "pce" -> new MetricText("PCE 물가지수", "물가", "% 전년비", "PCE는 Fed가 선호하는 물가 지표라 정책 기대를 잡아주는 기준입니다.");
			case "unemployment" -> new MetricText("실업률", "고용", "%", "실업률은 노동시장 여유와 성장 둔화 위험을 보여줍니다.");
			case "nonfarm-payrolls" -> new MetricText("비농업 고용", "고용", "천 명", "비농업 고용은 수요를 뒷받침할 만큼 일자리가 늘고 있는지 보여줍니다.");
			case "retail-sales" -> new MetricText("소매판매", "소비", "백만 달러", "소매판매는 미국 소비가 글로벌 수요를 지지하는지 알려줍니다.");
			case "gdp-growth" -> new MetricText("실질 GDP 성장률", "성장", "% 전분기 연율", "GDP 성장률은 미국 경제활동의 넓은 속도를 요약합니다.");
			case "ust10y" -> new MetricText("미국채 10년", "금리", "%", "장기 미국채 금리는 주식 밸류에이션, 글로벌 금리, 한국 자금 조달 여건에 영향을 줍니다.");
			case "ust2y" -> new MetricText("미국채 2년", "금리", "%", "2년물 금리는 Fed 정책 변화 기대에 민감합니다.");
			case "usd-krw" -> new MetricText("USD/KRW", "환율", "원/달러", "USD/KRW 압력은 한국 수입 비용과 외국인 자금 흐름에 연결됩니다.");
			case "sp500" -> new MetricText("S&P 500", "시장", "지수", "S&P 500은 미국 위험 선호를 빠르게 읽게 해줍니다.");
			case "wti" -> new MetricText("WTI 원유", "원자재", "달러/배럴", "WTI 유가는 운송비, 물가 기대, 한국 에너지 비용에 영향을 줍니다.");
			default -> null;
		};
	}

	private MetricText metricTextEn(String id) {
		return switch (id) {
			case "cpi" -> new MetricText("CPI", "Prices", "% YoY", "Inflation is a key input for the Fed path and Korean import-cost pressure.");
			case "core-cpi" -> new MetricText("Core CPI", "Prices", "% YoY", "Core inflation shows underlying price pressure after food and energy are removed.");
			case "pce" -> new MetricText("PCE Price Index", "Prices", "% YoY", "PCE is the Fed's preferred inflation gauge, so it anchors policy expectations.");
			case "unemployment" -> new MetricText("Unemployment Rate", "Labor", "%", "Unemployment tracks labor-market slack and the risk of a growth slowdown.");
			case "nonfarm-payrolls" -> new MetricText("Nonfarm Payrolls", "Labor", "thousand persons", "Payrolls show whether the labor market is adding jobs fast enough to support demand.");
			case "retail-sales" -> new MetricText("Retail Sales", "Consumption", "million USD", "Retail sales indicate whether U.S. consumption is supporting global demand.");
			case "gdp-growth" -> new MetricText("Real GDP Growth", "Growth", "% QoQ annualized", "GDP growth summarizes the broad pace of U.S. economic activity.");
			case "ust10y" -> new MetricText("U.S. Treasury 10Y", "Rates", "%", "Long-term Treasury yields affect equity valuation, global rates, and Korean funding conditions.");
			case "ust2y" -> new MetricText("U.S. Treasury 2Y", "Rates", "%", "Two-year Treasury yields are sensitive to expected Fed policy changes.");
			case "usd-krw" -> new MetricText("USD/KRW", "FX", "KRW per USD", "USD/KRW pressure feeds into Korean import costs and foreign capital flows.");
			case "sp500" -> new MetricText("S&P 500", "Market", "index", "The S&P 500 gives a quick read on U.S. risk appetite.");
			case "wti" -> new MetricText("WTI Crude Oil", "Commodities", "USD/bbl", "WTI oil prices affect transport costs, inflation expectations, and Korea's energy bill.");
			default -> null;
		};
	}

	private MetricText metricTextZhHans(String id) {
		return switch (id) {
			case "cpi" -> new MetricText("CPI", "价格", "同比 %", "通胀是判断 Fed 利率路径和韩国进口成本压力的关键输入。");
			case "core-cpi" -> new MetricText("Core CPI", "价格", "同比 %", "剔除食品和能源后的核心通胀显示更底层的价格压力。");
			case "pce" -> new MetricText("PCE 价格指数", "价格", "同比 %", "PCE 是 Fed 偏好的通胀指标，因此会影响政策预期。");
			case "unemployment" -> new MetricText("失业率", "就业", "%", "失业率反映劳动力市场松紧和增长放缓风险。");
			case "nonfarm-payrolls" -> new MetricText("非农就业", "就业", "千人", "非农就业显示劳动力市场是否足以支撑需求。");
			case "retail-sales" -> new MetricText("零售销售", "消费", "百万美元", "零售销售显示美国消费是否支撑全球需求。");
			case "gdp-growth" -> new MetricText("实际 GDP 增长率", "增长", "折年环比 %", "GDP 增长率概括美国经济活动的整体速度。");
			case "ust10y" -> new MetricText("美国国债 10 年期", "利率", "%", "长期美债收益率影响股票估值、全球利率和韩国融资环境。");
			case "ust2y" -> new MetricText("美国国债 2 年期", "利率", "%", "2 年期收益率对 Fed 政策变化预期很敏感。");
			case "usd-krw" -> new MetricText("USD/KRW", "汇率", "韩元/美元", "USD/KRW 压力会传导到韩国进口成本和外资流向。");
			case "sp500" -> new MetricText("S&P 500", "市场", "指数", "S&P 500 可快速观察美国风险偏好。");
			case "wti" -> new MetricText("WTI 原油", "大宗商品", "美元/桶", "WTI 油价会影响运输成本、通胀预期和韩国能源账单。");
			default -> null;
		};
	}

	private MetricText metricTextZhHant(String id) {
		return switch (id) {
			case "cpi" -> new MetricText("CPI", "價格", "年增 %", "通膨是判斷 Fed 利率路徑與韓國進口成本壓力的關鍵輸入。");
			case "core-cpi" -> new MetricText("Core CPI", "價格", "年增 %", "剔除食品與能源後的核心通膨顯示更底層的價格壓力。");
			case "pce" -> new MetricText("PCE 物價指數", "價格", "年增 %", "PCE 是 Fed 偏好的通膨指標，因此會影響政策預期。");
			case "unemployment" -> new MetricText("失業率", "就業", "%", "失業率反映勞動市場鬆緊與成長放緩風險。");
			case "nonfarm-payrolls" -> new MetricText("非農就業", "就業", "千人", "非農就業顯示勞動市場是否足以支撐需求。");
			case "retail-sales" -> new MetricText("零售銷售", "消費", "百萬美元", "零售銷售顯示美國消費是否支撐全球需求。");
			case "gdp-growth" -> new MetricText("實質 GDP 成長率", "成長", "折年季增 %", "GDP 成長率概括美國經濟活動的整體速度。");
			case "ust10y" -> new MetricText("美國公債 10 年期", "利率", "%", "長期美債殖利率影響股票估值、全球利率與韓國融資環境。");
			case "ust2y" -> new MetricText("美國公債 2 年期", "利率", "%", "2 年期殖利率對 Fed 政策變化預期很敏感。");
			case "usd-krw" -> new MetricText("USD/KRW", "匯率", "韓元/美元", "USD/KRW 壓力會傳導到韓國進口成本與外資流向。");
			case "sp500" -> new MetricText("S&P 500", "市場", "指數", "S&P 500 可快速觀察美國風險偏好。");
			case "wti" -> new MetricText("WTI 原油", "大宗商品", "美元/桶", "WTI 油價會影響運輸成本、通膨預期與韓國能源帳單。");
			default -> null;
		};
	}

	private MetricText metricTextJa(String id) {
		return switch (id) {
			case "cpi" -> new MetricText("CPI", "物価", "前年比 %", "インフレは Fed の金利経路と韓国の輸入コスト圧力を判断する重要な入力です。");
			case "core-cpi" -> new MetricText("Core CPI", "物価", "前年比 %", "食品とエネルギーを除いたコアインフレは基調的な物価圧力を示します。");
			case "pce" -> new MetricText("PCE 物価指数", "物価", "前年比 %", "PCE は Fed が重視する物価指標で、政策期待の軸になります。");
			case "unemployment" -> new MetricText("失業率", "雇用", "%", "失業率は労働市場の余裕と景気減速リスクを示します。");
			case "nonfarm-payrolls" -> new MetricText("非農業部門雇用者数", "雇用", "千人", "非農業部門雇用者数は需要を支える雇用増加の勢いを示します。");
			case "retail-sales" -> new MetricText("小売売上高", "消費", "百万ドル", "小売売上高は米国消費が世界需要を支えているかを示します。");
			case "gdp-growth" -> new MetricText("実質 GDP 成長率", "成長", "前期比年率 %", "GDP 成長率は米国経済活動の大きなペースを要約します。");
			case "ust10y" -> new MetricText("米国債 10 年", "金利", "%", "長期米国債利回りは株式評価、世界金利、韓国の資金調達環境に影響します。");
			case "ust2y" -> new MetricText("米国債 2 年", "金利", "%", "2 年債利回りは Fed 政策変更の期待に敏感です。");
			case "usd-krw" -> new MetricText("USD/KRW", "為替", "ウォン/ドル", "USD/KRW の圧力は韓国の輸入コストと海外資金フローにつながります。");
			case "sp500" -> new MetricText("S&P 500", "市場", "指数", "S&P 500 は米国のリスク選好を素早く読む指標です。");
			case "wti" -> new MetricText("WTI 原油", "商品", "ドル/バレル", "WTI 原油価格は輸送費、インフレ期待、韓国のエネルギー負担に影響します。");
			default -> null;
		};
	}

	private String text(
			SupportedLocale locale,
			String ko,
			String en,
			String zhHans,
			String zhHant,
			String ja) {
		return switch (locale) {
			case EN -> en;
			case ZH_HANS -> zhHans;
			case ZH_HANT -> zhHant;
			case JA -> ja;
			case KO -> ko;
		};
	}

	private record MetricText(String name, String category, String unit, String interpretation) {
	}
}
