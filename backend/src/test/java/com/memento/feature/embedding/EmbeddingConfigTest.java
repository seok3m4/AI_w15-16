package com.memento.feature.embedding;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestTemplate;

class EmbeddingConfigTest {

    @Test
    void embeddingRestTemplateAppliesEmbeddingTimeouts() {
        RestTemplateBuilder builder = mock(RestTemplateBuilder.class);
        RestTemplate restTemplate = new RestTemplate();
        EmbeddingProperties properties = new EmbeddingProperties();
        EmbeddingConfig config = new EmbeddingConfig();

        when(builder.connectTimeout(eq(Duration.ofSeconds(2)))).thenReturn(builder);
        when(builder.readTimeout(eq(Duration.ofSeconds(15)))).thenReturn(builder);
        when(builder.build()).thenReturn(restTemplate);

        config.embeddingRestTemplate(builder, properties);

        verify(builder).connectTimeout(Duration.ofSeconds(2));
        verify(builder).readTimeout(Duration.ofSeconds(15));
        verify(builder).build();
    }
}
