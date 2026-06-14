package com.junglecamp.backend.economy.service;

import com.junglecamp.backend.economy.definition.EconomyMetricDefinitions;
import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ForecastEstimate;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.AssetImpact;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.DataSourceInfo;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.DataSourcesResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.EventsResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MarketIndicator;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MarketIndicatorsResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricHistoryResponse;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricObservationPoint;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.MetricSourceComparison;
import com.junglecamp.backend.economy.dto.EconomySupplementDtos.ReportsResponse;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.repository.EconomySnapshotRepository;
import com.junglecamp.backend.i18n.SupportedLocale;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.function.Function;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EconomySupplementService {

	private final EconomySnapshotRepository repository;
	private final EconomyDashboardService dashboardService;
	private final EconomyTextCatalog textCatalog;
	private final String fredApiKey;
	private final String blsApiKey;
	private final String beaApiKey;
	private final String alphaVantageApiKey;
	private final String eiaApiKey;

	public EconomySupplementService(
			EconomySnapshotRepository repository,
			EconomyDashboardService dashboardService,
			EconomyTextCatalog textCatalog,
			@Value("${app.economy.fred.api-key:}") String fredApiKey,
			@Value("${app.economy.bls.api-key:}") String blsApiKey,
			@Value("${app.economy.bea.api-key:}") String beaApiKey,
			@Value("${app.economy.alpha-vantage.api-key:}") String alphaVantageApiKey,
			@Value("${app.economy.eia.api-key:}") String eiaApiKey) {
		this.repository = repository;
		this.dashboardService = dashboardService;
		this.textCatalog = textCatalog;
		this.fredApiKey = fredApiKey;
		this.blsApiKey = blsApiKey;
		this.beaApiKey = beaApiKey;
		this.alphaVantageApiKey = alphaVantageApiKey;
		this.eiaApiKey = eiaApiKey;
	}

	public MetricHistoryResponse history(String metricId, String range, SupportedLocale locale) {
		MetricDefinition definition = EconomyMetricDefinitions.byId(metricId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown metric id"));
		LocalDate startDate = startDate(range);
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		EconomyMetricSnapshot metric = latestMetric(metricId, definition, resolvedLocale);
		List<MetricSourceComparison> sourceComparisons = repository.findSourceComparisons(metricId);
		if (sourceComparisons.isEmpty()) {
			sourceComparisons = missingOrPendingComparisons(metricId);
		}
		return new MetricHistoryResponse(
				metric,
				repository.findMetricObservations(metricId, startDate),
				sourceComparisons,
				syncStatus(sourceComparisons),
				dataSourcesForMetric(metricId),
				assetImpact(metricId, resolvedLocale),
				relatedEvents(metricId, resolvedLocale));
	}

	public EventsResponse events(
			LocalDate from,
			LocalDate to,
			String source,
			String importance,
			String category,
			String relatedMetricId,
			SupportedLocale locale) {
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		List<EconomicEvent> items = repository.findEvents(from, to, source, importance, category, relatedMetricId).stream()
				.map(event -> withForecastEstimate(event, resolvedLocale))
				.map(event -> textCatalog.localizeEvent(event, resolvedLocale))
				.toList();
		return new EventsResponse(items);
	}

	public ReportsResponse reports(String category, String metricId, SupportedLocale locale) {
		List<ReportItem> items = dashboardService.reports(locale, category, metricId);
		return new ReportsResponse(items);
	}

	public DataSourcesResponse dataSources() {
		return new DataSourcesResponse(dataSourceCatalog());
	}

	public MarketIndicatorsResponse marketIndicators(String group, SupportedLocale locale) {
		String normalizedGroup = group == null || group.isBlank()
				? ""
				: group.toLowerCase(Locale.ROOT).trim();
		if (!normalizedGroup.isBlank() && allowedMarketGroups().stream().noneMatch(normalizedGroup::equals)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported market indicator group");
		}
		SupportedLocale resolvedLocale = locale == null ? SupportedLocale.KO : locale;
		Map<String, EconomyMetricSnapshot> metrics = repository.findLatestMetrics().stream()
				.map(metric -> textCatalog.localizeMetric(metric, resolvedLocale))
				.collect(Collectors.toMap(EconomyMetricSnapshot::id, Function.identity(), (left, right) -> left));
		List<MarketIndicator> items = marketIndicatorSpecs().stream()
				.filter(spec -> normalizedGroup.isBlank() || normalizedGroup.equals(spec.group()))
				.map(spec -> marketIndicator(spec, metrics))
				.toList();
		return new MarketIndicatorsResponse(items);
	}

	private LocalDate startDate(String range) {
		String normalized = range == null || range.isBlank() ? "3y" : range.toLowerCase(Locale.ROOT);
		return switch (normalized) {
			case "1y" -> LocalDate.now().minusYears(1);
			case "3y" -> LocalDate.now().minusYears(3);
			case "5y" -> LocalDate.now().minusYears(5);
			default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported history range");
		};
	}

	private EconomyMetricSnapshot latestMetric(String metricId, MetricDefinition definition, SupportedLocale locale) {
		Optional<EconomyMetricSnapshot> snapshot = repository.findLatestMetrics().stream()
				.filter(item -> metricId.equals(item.id()))
				.findFirst();
		EconomyMetricSnapshot metric = snapshot.orElseGet(() -> emptyMetric(definition));
		return textCatalog.localizeMetric(metric, locale == null ? SupportedLocale.KO : locale);
	}

	private List<EconomicEvent> relatedEvents(String metricId, SupportedLocale locale) {
		LocalDate today = LocalDate.now();
		return repository.findEvents(today.minusMonths(1), today.plusMonths(6), null, null, null, metricId).stream()
				.map(event -> withForecastEstimate(event, locale))
				.map(event -> textCatalog.localizeEvent(event, locale))
				.limit(5)
				.toList();
	}

	private EconomicEvent withForecastEstimate(EconomicEvent event, SupportedLocale locale) {
		if (hasText(event.forecastValue())) {
			return event;
		}
		ForecastEstimate estimate = forecastEstimate(event, locale).orElse(null);
		if (estimate == null) {
			return event;
		}
		return new EconomicEvent(
				event.id(),
				event.title(),
				event.releaseDateTime(),
				event.importance(),
				event.previousValue(),
				event.forecastValue(),
				event.actualValue(),
				event.unit(),
				event.status(),
				event.interpretation(),
				event.sourceName(),
				event.sourceUrl(),
				event.relatedMetricIds(),
				event.sourceType(),
				event.sourceEventId(),
				event.eventCategory(),
				event.updatedAt(),
				"estimated",
				estimate);
	}

	private Optional<ForecastEstimate> forecastEstimate(EconomicEvent event, SupportedLocale locale) {
		for (String metricId : event.relatedMetricIds()) {
			Optional<MetricDefinition> definition = EconomyMetricDefinitions.byId(metricId);
			if (definition.isEmpty()) {
				continue;
			}
			List<Double> values = repository.findMetricObservations(metricId, LocalDate.now().minusYears(3)).stream()
					.map(MetricObservationPoint::value)
					.map(this::parseNumber)
					.flatMap(Optional::stream)
					.toList();
			Optional<String> estimatedValue = projectedNextValue(values);
			if (estimatedValue.isEmpty()) {
				continue;
			}
			String unit = latestMetric(metricId, definition.get(), locale).unit();
			return Optional.of(new ForecastEstimate(
					estimatedValue.get(),
					unit,
					"estimated",
					"recent_average_change",
					"low",
					forecastEstimateNote(locale)));
		}
		return Optional.empty();
	}

	private Optional<String> projectedNextValue(List<Double> values) {
		if (values.size() < 2) {
			return Optional.empty();
		}
		int start = Math.max(1, values.size() - 3);
		List<Double> deltas = new ArrayList<>();
		for (int index = start; index < values.size(); index++) {
			deltas.add(values.get(index) - values.get(index - 1));
		}
		double averageDelta = deltas.stream().mapToDouble(Double::doubleValue).average().orElse(0);
		return Optional.of(formatEstimate(values.get(values.size() - 1) + averageDelta));
	}

	private Optional<Double> parseNumber(String value) {
		if (value == null || value.isBlank()) {
			return Optional.empty();
		}
		try {
			double parsed = Double.parseDouble(value.replace(",", "").trim());
			return Double.isFinite(parsed) ? Optional.of(parsed) : Optional.empty();
		} catch (NumberFormatException exception) {
			return Optional.empty();
		}
	}

	private String formatEstimate(double value) {
		DecimalFormat formatter = new DecimalFormat("0.##", DecimalFormatSymbols.getInstance(Locale.US));
		return formatter.format(value);
	}

	private String forecastEstimateNote(SupportedLocale locale) {
		if (locale == SupportedLocale.EN) {
			return "Heuristic estimate from recent FRED cache changes; this is not an official consensus forecast.";
		}
		return "최근 FRED 캐시 변화폭으로 계산한 학습용 추정치이며 공식 컨센서스가 아닙니다.";
	}

	private List<DataSourceInfo> dataSourcesForMetric(String metricId) {
		Set<String> ids = new LinkedHashSet<>();
		ids.add("fred");
		for (SourceSpec spec : sourceSpecs(metricId)) {
			ids.add(providerId(spec.provider()));
		}
		if ("wti".equals(metricId)) {
			ids.add("eia");
			ids.add("cftc");
		}
		if ("sp500".equals(metricId)) {
			ids.add("sec");
			ids.add("cftc");
		}
		return dataSourceCatalog().stream()
				.filter(source -> ids.contains(source.id()))
				.toList();
	}

	private AssetImpact assetImpact(String metricId, SupportedLocale locale) {
		boolean english = locale == SupportedLocale.EN;
		return switch (metricId) {
			case "cpi", "core-cpi", "pce" -> english
					? new AssetImpact(
							"Hot inflation can pressure equity valuations, especially long-duration growth stocks.",
							"Hot inflation usually lifts yield expectations and weighs on bond prices.",
							"Gold can benefit from inflation hedging, but a stronger real-rate move can offset it.",
							"Hot inflation often supports the dollar if markets price a tighter Fed path.",
							"General learning note only; this is not investment advice.")
					: new AssetImpact(
							"물가가 예상보다 높으면 성장주 밸류에이션에 부담이 될 수 있습니다.",
							"물가가 높으면 금리 기대가 올라 채권 가격에는 부담이 되는 경우가 많습니다.",
							"금은 인플레이션 헤지 수요를 받을 수 있지만 실질금리 상승은 부담입니다.",
							"Fed 긴축 기대가 커지면 달러 강세 요인이 될 수 있습니다.",
							"학습용 일반 해석이며 투자 조언이 아닙니다.");
			case "unemployment", "nonfarm-payrolls" -> english
					? new AssetImpact(
							"Strong labor data can support earnings expectations but may also keep rates higher.",
							"Too-strong labor data can raise yields; weak data can support bonds through growth fear.",
							"Gold often reacts through the dollar and real-rate channel after jobs data.",
							"Strong jobs data can support the dollar when it delays Fed easing.",
							"Read labor data together with wages and inflation.")
					: new AssetImpact(
							"고용이 강하면 기업 실적 기대에는 좋지만 금리 부담이 커질 수 있습니다.",
							"고용 과열은 금리 상승 요인, 고용 둔화는 경기 우려를 통한 채권 지지 요인이 될 수 있습니다.",
							"금은 고용 발표 후 달러와 실질금리 경로를 통해 반응하는 경우가 많습니다.",
							"고용 강세가 금리 인하 지연으로 해석되면 달러 강세 요인이 될 수 있습니다.",
							"고용은 임금과 물가 지표와 함께 봐야 합니다.");
			case "ust10y", "ust2y" -> english
					? new AssetImpact(
							"Higher yields can compress equity multiples.",
							"Yield rises usually mean lower existing bond prices.",
							"Gold often struggles when real yields rise.",
							"Higher U.S. yields can support the dollar.",
							"Nominal yields should be compared with real yields and breakevens.")
					: new AssetImpact(
							"금리 상승은 주식의 밸류에이션 배수에 부담이 될 수 있습니다.",
							"수익률 상승은 기존 채권 가격 하락을 의미하는 경우가 많습니다.",
							"실질금리가 오르면 금에는 부담이 되는 경우가 많습니다.",
							"미국 금리 상승은 달러 강세 요인이 될 수 있습니다.",
							"명목금리는 실질금리와 기대인플레이션을 함께 봐야 합니다.");
			case "usd-krw" -> english
					? new AssetImpact(
							"A stronger dollar can pressure foreign risk assets and Korea-sensitive exporters/importers differently.",
							"FX stress can lift demand for safe Treasury duration.",
							"Gold may rise as a safe haven, but dollar strength can cap gains.",
							"USD/KRW directly tracks dollar pressure against the won.",
							"Use FX as a stress signal, not a standalone prediction.")
					: new AssetImpact(
							"달러 강세는 해외 위험자산에 부담이 되고 한국 수출입 업종 영향은 엇갈릴 수 있습니다.",
							"환율 스트레스는 안전자산 선호와 장기채 수요로 이어질 수 있습니다.",
							"금은 안전자산 수요를 받을 수 있지만 달러 강세가 상승을 제한할 수 있습니다.",
							"USD/KRW는 원화 대비 달러 압력을 직접 보여줍니다.",
							"환율은 단독 예측 지표가 아니라 스트레스 신호로 봐야 합니다.");
			case "sp500" -> english
					? new AssetImpact(
							"The S&P 500 is the direct risk-appetite signal.",
							"Equity weakness can raise safe-haven demand for Treasuries.",
							"Gold can benefit when equity weakness becomes a risk-off shock.",
							"Risk-off equity moves can support the dollar through safe-haven demand.",
							"Index levels should be read with earnings, rates, and credit spreads.")
					: new AssetImpact(
							"S&P 500은 위험선호를 직접 보여주는 대표 지표입니다.",
							"주식 약세는 안전자산 선호로 미 국채 수요를 높일 수 있습니다.",
							"주식 약세가 위험회피 충격으로 번지면 금에 우호적일 수 있습니다.",
							"위험회피 장세에서는 달러 안전자산 수요가 커질 수 있습니다.",
							"지수는 실적, 금리, 신용스프레드와 함께 봐야 합니다.");
			default -> english
					? new AssetImpact(
							"Use this indicator as one input for equity risk appetite.",
							"Check whether the indicator changes growth or inflation expectations for bonds.",
							"Gold usually reacts through inflation, dollar, and real-rate channels.",
							"The dollar usually responds to relative growth, rates, and risk appetite.",
							"General learning note only; this is not investment advice.")
					: new AssetImpact(
							"이 지표는 주식 위험선호를 판단하는 보조 입력으로 봅니다.",
							"채권은 이 지표가 성장/물가/금리 기대를 바꾸는지 확인합니다.",
							"금은 주로 물가, 달러, 실질금리 경로로 반응합니다.",
							"달러는 상대 성장, 금리, 위험선호 변화에 반응합니다.",
							"학습용 일반 해석이며 투자 조언이 아닙니다.");
		};
	}

	private List<DataSourceInfo> dataSourceCatalog() {
		return List.of(
				new DataSourceInfo(
						"fred",
						"FRED",
						"official_aggregator",
						"Canonical macro snapshots, history, and release dates.",
						"U.S. macro, rates, FX, market and commodity series.",
						"Official release or daily series cadence.",
						true,
						"https://fred.stlouisfed.org/docs/api/fred/series_observations.html",
						providerStatus("FRED")),
				new DataSourceInfo(
						"bls",
						"BLS",
						"official_api",
						"CPI, Core CPI, labor data, and release calendar verification.",
						"Inflation and labor market official source series.",
						"Monthly or release-specific.",
						true,
						"https://www.bls.gov/developers/api_signature_v2.htm",
						providerStatus("BLS")),
				new DataSourceInfo(
						"bea",
						"BEA",
						"official_api",
						"GDP, PCE, personal income/outlays, and release schedule verification.",
						"National accounts and spending data.",
						"Monthly, quarterly, or scheduled release cadence.",
						true,
						"https://www.bea.gov/news/schedule",
						providerStatus("BEA")),
				new DataSourceInfo(
						"alpha-vantage",
						"Alpha Vantage",
						"market_data_api",
						"ETF, FX, commodity, and market proxy comparison data.",
						"Daily market proxies; realtime and full intraday data may require paid access.",
						"Daily or provider-limited intraday cadence.",
						true,
						"https://www.alphavantage.co/documentation/",
						providerStatus("ALPHA_VANTAGE")),
				new DataSourceInfo(
						"eia",
						"EIA",
						"official_open_data",
						"Energy prices, petroleum, natural gas, and supply context.",
						"U.S. energy market data.",
						"Daily, weekly, monthly, or annual depending on dataset.",
						true,
						"https://www.eia.gov/opendata/",
						hasText(eiaApiKey) ? "not_synced" : "missing_config"),
				new DataSourceInfo(
						"cftc",
						"CFTC COT",
						"official_report",
						"Weekly futures positioning context for commodities, rates, and equity futures.",
						"Commitments of Traders reports.",
						"Generally weekly on Friday 3:30 p.m. ET.",
						false,
						"https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",
						"available"),
				new DataSourceInfo(
						"sec",
						"SEC EDGAR",
						"official_filings_api",
						"Company filings and XBRL facts for corporate event context.",
						"Public company submissions and financial statement facts.",
						"Near real-time filing dissemination with nightly bulk archives.",
						false,
						"https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
						"available"),
				new DataSourceInfo(
						"gdelt",
						"GDELT",
						"open_news_data",
						"News context around economic releases and market reaction.",
						"Global news metadata and document search.",
						"Near-real-time news indexing.",
						false,
						"https://www.gdeltproject.org/data.html",
						"available"));
	}

	private String providerStatus(String provider) {
		if (!hasProviderKey(provider)) {
			return "missing_config";
		}
		if ("FRED".equals(provider)) {
			return repository.findLatestMetrics().isEmpty() ? "not_synced" : "synced";
		}
		List<MetricSourceComparison> comparisons = EconomyMetricDefinitions.all().stream()
				.flatMap(definition -> repository.findSourceComparisons(definition.id()).stream())
				.filter(comparison -> provider.equals(comparison.provider()))
				.toList();
		if (comparisons.stream().anyMatch(comparison -> "synced".equals(comparison.status()))) {
			return "synced";
		}
		return comparisons.stream()
				.map(MetricSourceComparison::status)
				.findFirst()
				.orElse("not_synced");
	}

	private MarketIndicator marketIndicator(MarketIndicatorSpec spec, Map<String, EconomyMetricSnapshot> metrics) {
		if (spec.metricId() != null && metrics.containsKey(spec.metricId())) {
			EconomyMetricSnapshot metric = metrics.get(spec.metricId());
			return new MarketIndicator(
					spec.id(),
					spec.name(),
					spec.group(),
					metric.value(),
					metric.unit(),
					metric.baseDate(),
					metric.sourceName(),
					metric.sourceUrl(),
					metric.change(),
					"synced");
		}
		return new MarketIndicator(
				spec.id(),
				spec.name(),
				spec.group(),
				"",
				spec.unit(),
				"",
				spec.sourceName(),
				spec.sourceUrl(),
				"",
				missingStatus(spec.provider()));
	}

	private String missingStatus(String provider) {
		if (!hasProviderKey(provider)) {
			return "missing_config";
		}
		return "not_synced";
	}

	private List<String> allowedMarketGroups() {
		return List.of("equity", "rates", "bonds", "gold", "fx", "energy", "liquidity");
	}

	private List<MarketIndicatorSpec> marketIndicatorSpecs() {
		return List.of(
				new MarketIndicatorSpec("sp500", "S&P 500", "equity", "sp500", "index", "FRED", "https://fred.stlouisfed.org/series/SP500", "FRED"),
				new MarketIndicatorSpec("vix", "VIX", "equity", null, "index", "FRED", "https://fred.stlouisfed.org/series/VIXCLS", "FRED"),
				new MarketIndicatorSpec("spy", "SPY ETF", "equity", null, "ETF price", "Alpha Vantage", "https://www.alphavantage.co/documentation/", "ALPHA_VANTAGE"),
				new MarketIndicatorSpec("qqq", "QQQ ETF", "equity", null, "ETF price", "Alpha Vantage", "https://www.alphavantage.co/documentation/", "ALPHA_VANTAGE"),
				new MarketIndicatorSpec("ust2y", "U.S. Treasury 2Y", "rates", "ust2y", "%", "FRED", "https://fred.stlouisfed.org/series/DGS2", "FRED"),
				new MarketIndicatorSpec("ust10y", "U.S. Treasury 10Y", "rates", "ust10y", "%", "FRED", "https://fred.stlouisfed.org/series/DGS10", "FRED"),
				new MarketIndicatorSpec("yield-curve-10y2y", "10Y-2Y Treasury Spread", "rates", null, "%", "FRED", "https://fred.stlouisfed.org/series/T10Y2Y", "FRED"),
				new MarketIndicatorSpec("real-yield-10y", "10Y Real Yield", "bonds", null, "%", "FRED", "https://fred.stlouisfed.org/series/DFII10", "FRED"),
				new MarketIndicatorSpec("breakeven-10y", "10Y Breakeven Inflation", "bonds", null, "%", "FRED", "https://fred.stlouisfed.org/series/T10YIE", "FRED"),
				new MarketIndicatorSpec("tlt", "TLT ETF", "bonds", null, "ETF price", "Alpha Vantage", "https://www.alphavantage.co/documentation/", "ALPHA_VANTAGE"),
				new MarketIndicatorSpec("ief", "IEF ETF", "bonds", null, "ETF price", "Alpha Vantage", "https://www.alphavantage.co/documentation/", "ALPHA_VANTAGE"),
				new MarketIndicatorSpec("gold-spot", "Gold Spot", "gold", null, "USD/oz", "Alpha Vantage", "https://www.alphavantage.co/documentation/", "ALPHA_VANTAGE"),
				new MarketIndicatorSpec("usd-krw", "USD/KRW", "fx", "usd-krw", "KRW per USD", "FRED", "https://fred.stlouisfed.org/series/DEXKOUS", "FRED"),
				new MarketIndicatorSpec("wti", "WTI Crude Oil", "energy", "wti", "USD/bbl", "FRED", "https://fred.stlouisfed.org/series/DCOILWTICO", "FRED"),
				new MarketIndicatorSpec("eia-petroleum", "EIA Petroleum Context", "energy", null, "varies", "EIA", "https://www.eia.gov/opendata/", "EIA"),
				new MarketIndicatorSpec("fed-balance-sheet", "Fed Balance Sheet", "liquidity", null, "million USD", "FRED", "https://fred.stlouisfed.org/series/WALCL", "FRED"),
				new MarketIndicatorSpec("hy-spread", "High Yield Spread", "liquidity", null, "%", "FRED", "https://fred.stlouisfed.org/series/BAMLH0A0HYM2", "FRED"),
				new MarketIndicatorSpec("financial-conditions", "Financial Conditions", "liquidity", null, "index", "FRED", "https://fred.stlouisfed.org/series/NFCI", "FRED"));
	}

	private EconomyMetricSnapshot emptyMetric(MetricDefinition definition) {
		return new EconomyMetricSnapshot(
				definition.id(),
				definition.seriesId(),
				definition.name(),
				definition.category(),
				"",
				definition.unit(),
				"",
				"",
				"FRED",
				definition.sourceUrl(),
				"",
				"",
				"",
				definition.interpretation(),
				OffsetDateTime.now().toString());
	}

	private List<MetricSourceComparison> missingOrPendingComparisons(String metricId) {
		return sourceSpecs(metricId).stream()
				.map(spec -> new MetricSourceComparison(
						spec.provider(),
						spec.providerSeriesId(),
						"",
						spec.unit(),
						"",
						spec.unit(),
						"",
						"",
						hasProviderKey(spec.provider())
								? "Source comparison has not synced yet."
								: spec.provider() + " API key is not configured.",
						"",
						spec.sourceUrl(),
						hasProviderKey(spec.provider()) ? "not_synced" : "missing_config",
						hasProviderKey(spec.provider()) ? "Source comparison has not synced yet." : spec.provider() + " API key is not configured.",
						OffsetDateTime.now().toString()))
				.toList();
	}

	private String syncStatus(List<MetricSourceComparison> comparisons) {
		if (comparisons.stream().anyMatch(item -> "synced".equals(item.status()))) {
			return "synced";
		}
		if (comparisons.stream().anyMatch(item -> "missing_config".equals(item.status()))) {
			return "missing_config";
		}
		if (comparisons.isEmpty()) {
			return "empty";
		}
		return "not_synced";
	}

	private boolean hasProviderKey(String provider) {
		return switch (provider) {
			case "FRED" -> hasText(fredApiKey);
			case "BLS" -> hasText(blsApiKey);
			case "BEA" -> hasText(beaApiKey);
			case "ALPHA_VANTAGE" -> hasText(alphaVantageApiKey);
			case "EIA" -> hasText(eiaApiKey);
			default -> false;
		};
	}

	private String providerId(String provider) {
		return switch (provider) {
			case "FRED" -> "fred";
			case "BLS" -> "bls";
			case "BEA" -> "bea";
			case "ALPHA_VANTAGE" -> "alpha-vantage";
			case "EIA" -> "eia";
			default -> provider.toLowerCase(Locale.ROOT);
		};
	}

	static List<SourceSpec> sourceSpecs(String metricId) {
		return switch (metricId) {
			case "cpi" -> List.of(new SourceSpec("BLS", "CUUR0000SA0", "index", "https://www.bls.gov/cpi/"));
			case "core-cpi" -> List.of(new SourceSpec("BLS", "CUUR0000SA0L1E", "index", "https://www.bls.gov/cpi/"));
			case "pce" -> List.of(new SourceSpec("BEA", "NIPA:PCEPI", "index", "https://www.bea.gov/data/personal-consumption-expenditures-price-index"));
			case "unemployment" -> List.of(new SourceSpec("BLS", "LNS14000000", "%", "https://www.bls.gov/cps/"));
			case "nonfarm-payrolls" -> List.of(new SourceSpec("BLS", "CES0000000001", "thousand persons", "https://www.bls.gov/ces/"));
			case "retail-sales" -> List.of(new SourceSpec("ALPHA_VANTAGE", "RETAIL_SALES", "million USD", "https://www.alphavantage.co/documentation/"));
			case "gdp-growth" -> List.of(new SourceSpec("BEA", "NIPA:T10101:1", "% QoQ annualized", "https://www.bea.gov/data/gdp/gross-domestic-product"));
			case "ust10y" -> List.of(new SourceSpec("ALPHA_VANTAGE", "TREASURY_YIELD_10YEAR", "%", "https://www.alphavantage.co/documentation/"));
			case "ust2y" -> List.of(new SourceSpec("ALPHA_VANTAGE", "TREASURY_YIELD_2YEAR", "%", "https://www.alphavantage.co/documentation/"));
			case "usd-krw" -> List.of(new SourceSpec("ALPHA_VANTAGE", "FX_USD_KRW", "KRW per USD", "https://www.alphavantage.co/documentation/"));
			case "sp500" -> List.of(new SourceSpec("ALPHA_VANTAGE", "SPY_PROXY", "ETF price", "https://www.alphavantage.co/documentation/"));
			case "wti" -> List.of(new SourceSpec("ALPHA_VANTAGE", "WTI", "USD/bbl", "https://www.alphavantage.co/documentation/"));
			default -> List.of();
		};
	}

	private boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	public record SourceSpec(String provider, String providerSeriesId, String unit, String sourceUrl) {
	}

	private record MarketIndicatorSpec(
			String id,
			String name,
			String group,
			String metricId,
			String unit,
			String sourceName,
			String sourceUrl,
			String provider) {
	}
}
