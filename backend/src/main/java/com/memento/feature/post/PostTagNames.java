package com.memento.feature.post;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

final class PostTagNames {

    private PostTagNames() {
    }

    static List<String> normalize(List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return List.of();
        }

        LinkedHashMap<String, String> tagNamesByNormalizedName = new LinkedHashMap<>();
        for (String tagName : tagNames) {
            if (tagName == null) {
                continue;
            }
            String trimmed = tagName.trim();
            if (!trimmed.isEmpty()) {
                tagNamesByNormalizedName.putIfAbsent(trimmed.toLowerCase(Locale.ROOT), trimmed);
            }
        }
        return List.copyOf(tagNamesByNormalizedName.values());
    }
}
