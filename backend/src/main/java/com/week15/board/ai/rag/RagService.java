package com.week15.board.ai.rag;

import java.util.List;

public interface RagService {

    List<RetrievedDocument> retrieve(String query, int topK);
}

