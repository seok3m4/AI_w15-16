package com.junglecamp.backend.economy.definition;

import java.util.List;
import java.util.Optional;

public final class EconomyMetricDefinitions {

	private static final List<MetricDefinition> DEFINITIONS = List.of(
			new MetricDefinition("cpi", "CPIAUCSL", "CPI", "Prices", "% YoY", "pc1", 1, "monthly",
					"Inflation is a key input for the Fed path and Korean import-cost pressure."),
			new MetricDefinition("core-cpi", "CPILFESL", "Core CPI", "Prices", "% YoY", "pc1", 1, "monthly",
					"Core inflation shows underlying price pressure after food and energy are removed."),
			new MetricDefinition("pce", "PCEPI", "PCE Price Index", "Prices", "% YoY", "pc1", 1, "monthly",
					"PCE is the Fed's preferred inflation gauge, so it anchors policy expectations."),
			new MetricDefinition("unemployment", "UNRATE", "Unemployment Rate", "Labor", "%", "lin", 1, "monthly",
					"Unemployment tracks labor-market slack and the risk of a growth slowdown."),
			new MetricDefinition("nonfarm-payrolls", "PAYEMS", "Nonfarm Payrolls", "Labor", "thousand persons", "lin", 0,
					"monthly", "Payrolls show whether the labor market is adding jobs fast enough to support demand."),
			new MetricDefinition("retail-sales", "RSAFS", "Retail Sales", "Consumption", "million USD", "lin", 0,
					"monthly", "Retail sales indicate whether U.S. consumption is supporting global demand."),
			new MetricDefinition("gdp-growth", "A191RL1Q225SBEA", "Real GDP Growth", "Growth", "% QoQ annualized", "lin", 1,
					"quarterly", "GDP growth summarizes the broad pace of U.S. economic activity."),
			new MetricDefinition("ust10y", "DGS10", "U.S. Treasury 10Y", "Rates", "%", "lin", 2, "daily",
					"Long-term Treasury yields affect equity valuation, global rates, and Korean funding conditions."),
			new MetricDefinition("ust2y", "DGS2", "U.S. Treasury 2Y", "Rates", "%", "lin", 2, "daily",
					"Two-year Treasury yields are sensitive to expected Fed policy changes."),
			new MetricDefinition("usd-krw", "DEXKOUS", "USD/KRW", "FX", "KRW per USD", "lin", 2, "daily",
					"USD/KRW pressure feeds into Korean import costs and foreign capital flows."),
			new MetricDefinition("sp500", "SP500", "S&P 500", "Market", "index", "lin", 2, "daily",
					"The S&P 500 gives a quick read on U.S. risk appetite."),
			new MetricDefinition("wti", "DCOILWTICO", "WTI Crude Oil", "Commodities", "USD/bbl", "lin", 2, "daily",
					"WTI oil prices affect transport costs, inflation expectations, and Korea's energy bill."));

	private EconomyMetricDefinitions() {
	}

	public static List<MetricDefinition> all() {
		return DEFINITIONS;
	}

	public static Optional<MetricDefinition> byId(String id) {
		return DEFINITIONS.stream()
				.filter(definition -> definition.id().equals(id))
				.findFirst();
	}

	public static int orderOf(String id) {
		for (int index = 0; index < DEFINITIONS.size(); index++) {
			if (DEFINITIONS.get(index).id().equals(id)) {
				return index;
			}
		}
		return Integer.MAX_VALUE;
	}
}
