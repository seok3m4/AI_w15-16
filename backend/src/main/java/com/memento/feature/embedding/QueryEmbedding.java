package com.memento.feature.embedding;

import java.util.List;

public record QueryEmbedding(
        String provider,
        String model,
        int dimension,
        List<Double> vector) {
}
