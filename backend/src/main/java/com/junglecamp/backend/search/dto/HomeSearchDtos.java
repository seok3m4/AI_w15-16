package com.junglecamp.backend.search.dto;

import com.junglecamp.backend.board.dto.BoardPostDtos.PostSummary;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.EconomicEvent;
import com.junglecamp.backend.economy.dto.EconomyDashboardDtos.ReportItem;
import java.util.List;

public final class HomeSearchDtos {

	private HomeSearchDtos() {
	}

	public record HomeSearchResponse(
			String query,
			List<PostSummary> discussions,
			List<EconomicEvent> events,
			List<ReportItem> reports) {
	}
}
