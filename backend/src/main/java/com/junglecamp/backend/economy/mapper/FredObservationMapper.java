package com.junglecamp.backend.economy.mapper;

import com.junglecamp.backend.economy.definition.MetricDefinition;
import com.junglecamp.backend.economy.model.EconomyMetricSnapshot;
import com.junglecamp.backend.economy.model.FredObservation;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FredObservationMapper {

	public EconomyMetricSnapshot toSnapshot(MetricDefinition definition, List<FredObservation> observations) {
		List<FredObservation> usable = observations.stream()
				.filter(observation -> observation.value() != null)
				.filter(observation -> !".".equals(observation.value()))
				.sorted(Comparator.comparing(FredObservation::date))
				.toList();

		if (usable.size() < 2) {
			throw new IllegalArgumentException("At least two usable FRED observations are required for " + definition.id());
		}

		FredObservation previous = usable.get(usable.size() - 2);
		FredObservation latest = usable.get(usable.size() - 1);
		BigDecimal previousValue = new BigDecimal(previous.value());
		BigDecimal latestValue = new BigDecimal(latest.value());
		BigDecimal change = latestValue.subtract(previousValue);
		BigDecimal changePercent = previousValue.compareTo(BigDecimal.ZERO) == 0
				? BigDecimal.ZERO
				: change.divide(previousValue.abs(), 6, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100));
		String baseDate = baseDate(latest.date(), definition.frequency());

		return new EconomyMetricSnapshot(
				definition.id(),
				definition.seriesId(),
				definition.name(),
				definition.category(),
				format(latestValue, definition.decimals()),
				definition.unit(),
				baseDate,
				baseDate,
				"FRED",
				definition.sourceUrl(),
				format(previousValue, definition.decimals()),
				formatSigned(change, definition.decimals()),
				formatSigned(changePercent, 1) + "%",
				definition.interpretation(),
				OffsetDateTime.now().toString());
	}

	private String baseDate(String date, String frequency) {
		if ("daily".equals(frequency)) {
			return date;
		}
		if ("monthly".equals(frequency) && date.length() >= 7) {
			return date.substring(0, 7);
		}
		if ("quarterly".equals(frequency) && date.length() >= 7) {
			int month = Integer.parseInt(date.substring(5, 7));
			int quarter = ((month - 1) / 3) + 1;
			return date.substring(0, 4) + "-Q" + quarter;
		}
		return date;
	}

	private String formatSigned(BigDecimal value, int decimals) {
		String formatted = format(value, decimals);
		return value.compareTo(BigDecimal.ZERO) > 0 ? "+" + formatted : formatted;
	}

	private String format(BigDecimal value, int decimals) {
		BigDecimal scaled = value.setScale(decimals, RoundingMode.HALF_UP);
		return decimals == 0 ? scaled.toPlainString() : scaled.toPlainString();
	}
}
