package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.AiBrief;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.time.OffsetDateTime;
import java.util.List;

public final class RuleBasedBriefFactory {

	private RuleBasedBriefFactory() {
	}

	public static AiBrief fallback(
			List<EconomyMetricSnapshot> metrics,
			List<EconomicEvent> events,
			String generationStatus) {
		return fallback(metrics, events, generationStatus, SupportedLocale.KO);
	}

	public static AiBrief fallback(
			List<EconomyMetricSnapshot> metrics,
			List<EconomicEvent> events,
			String generationStatus,
			SupportedLocale locale) {
		List<String> evidenceMetricIds = metrics.stream()
				.filter(metric -> hasText(metric.sourceName()))
				.filter(metric -> hasText(metric.sourceUrl()))
				.map(EconomyMetricSnapshot::id)
				.limit(5)
				.toList();
		List<String> evidenceEventIds = events.stream()
				.filter(event -> hasText(event.sourceName()))
				.filter(event -> hasText(event.sourceUrl()))
				.map(EconomicEvent::id)
				.limit(3)
				.toList();

		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		String summary = metrics.isEmpty()
				? text(
						resolvedLocale,
						"아직 동기화된 FRED 지표가 없습니다. 서버가 API 키와 네트워크를 확인한 뒤 캐시를 채웁니다.",
						"No FRED metrics have been synced yet. The server will fill the cache after checking the API key and network.",
						"尚未同步 FRED 指标。服务器会在确认 API key 和网络后填充缓存。",
						"尚未同步 FRED 指標。伺服器會在確認 API key 與網路後填充快取。",
						"まだ FRED 指標が同期されていません。サーバーが API キーとネットワークを確認した後にキャッシュを埋めます。")
				: text(
						resolvedLocale,
						"FRED에서 동기화된 최신 지표 기준으로 미국 경제를 요약했습니다. 물가, 고용, 금리, 환율을 함께 보며 한국 영향은 보수적으로 해석합니다.",
						"The U.S. economy was summarized from the latest FRED-synced metrics. Prices, labor, rates, and FX are read together, with Korea impact interpreted conservatively.",
						"基于 FRED 同步的最新指标总结美国经济。会同时观察物价、就业、利率和汇率，并谨慎解释对韩国的影响。",
						"基於 FRED 同步的最新指標摘要美國經濟。會同時觀察物價、就業、利率與匯率，並謹慎解讀對韓國的影響。",
						"FRED から同期された最新指標を基準に米国経済を要約しました。物価、雇用、金利、為替を合わせて見て、韓国への影響は慎重に解釈します。");
		String koreaImpact = metrics.stream().anyMatch(metric -> "usd-krw".equals(metric.id()))
				? text(
						resolvedLocale,
						"환율과 미국 금리 흐름은 한국 수입 비용, 외국인 자금 흐름, 성장주 밸류에이션에 바로 영향을 줄 수 있습니다.",
						"FX and U.S. rate moves can directly affect Korean import costs, foreign capital flows, and growth-stock valuation.",
						"汇率和美国利率变化可能直接影响韩国进口成本、外资流向和成长股估值。",
						"匯率與美國利率變化可能直接影響韓國進口成本、外資流向與成長股估值。",
						"為替と米国金利の動きは、韓国の輸入コスト、海外資金フロー、成長株の評価に直接影響し得ます。")
				: text(
						resolvedLocale,
						"한국 영향은 환율, 수출 수요, 금리 민감 업종을 중심으로 확인해야 합니다.",
						"Korea impact should be checked through FX, export demand, and rate-sensitive sectors.",
						"对韩国的影响应重点通过汇率、出口需求和利率敏感行业来确认。",
						"對韓國的影響應重點透過匯率、出口需求與利率敏感產業來確認。",
						"韓国への影響は、為替、輸出需要、金利敏感業種を中心に確認します。");

		return new AiBrief(
				summary,
				metrics.isEmpty()
						? text(resolvedLocale, "동기화 대기", "Waiting for sync", "等待同步", "等待同步", "同期待ち")
						: text(resolvedLocale, "공식 데이터 기반 점검", "Official-data check", "基于官方数据检查", "基於官方資料檢查", "公式データに基づく確認"),
				evidenceMetricIds,
				evidenceEventIds,
				koreaImpact,
				List.of(
						text(
								resolvedLocale,
								"FRED 발표 주기와 실제 원천기관 발표 시점이 다를 수 있습니다.",
								"FRED release timing can differ from the original source agency schedule.",
								"FRED 发布时间可能与原始机构发布时间不同。",
								"FRED 發布時間可能與原始機構發布時間不同。",
								"FRED の公表タイミングは元の機関の発表時点と異なる場合があります。"),
						text(
								resolvedLocale,
								"출처 URL이 없는 값은 AI 요약 근거에서 제외합니다.",
								"Values without source URLs are excluded from AI summary evidence.",
								"没有来源 URL 的数值会从 AI 摘要证据中排除。",
								"沒有來源 URL 的數值會從 AI 摘要證據中排除。",
								"出典 URL のない値は AI サマリーの根拠から除外します。")),
				OffsetDateTime.now().toString(),
				generationStatus);
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private static String text(
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
}
