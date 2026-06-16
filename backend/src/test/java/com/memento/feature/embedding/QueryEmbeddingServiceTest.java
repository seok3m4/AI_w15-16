package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class QueryEmbeddingServiceTest {

    private static final UUID QUERY_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000000");

    @Test
    void createPostsQueryInputTypeAndReturnsSingleVectorWithProviderMetadata() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        EmbeddingProperties properties = new EmbeddingProperties();
        properties.setBaseUrl("http://ai-server:8000");
        FastApiEmbeddingClient client = new FastApiEmbeddingClient(restTemplate, properties);
        QueryEmbeddingService service = new QueryEmbeddingService(client, properties, () -> QUERY_ID);

        server.expect(requestTo("http://ai-server:8000/internal/v1/embeddings"))
                .andExpect(content().json(
                        """
                        {
                          "inputType": "query",
                          "items": [
                            {
                              "text": "jwt decision"
                            }
                          ]
                        }
                        """))
                .andRespond(withSuccess(responseBody(), MediaType.APPLICATION_JSON));

        QueryEmbedding embedding = service.create("jwt decision");

        assertThat(embedding.provider()).isEqualTo("mock");
        assertThat(embedding.model()).isEqualTo("text-embedding-3-small");
        assertThat(embedding.dimension()).isEqualTo(1536);
        assertThat(embedding.vector()).containsExactlyElementsOf(vector());
        server.verify();
    }

    private String responseBody() {
        return """
                {
                  "provider": "mock",
                  "model": "text-embedding-3-small",
                  "dimension": 1536,
                  "embeddings": [
                    {
                      "id": "%s",
                      "vector": %s,
                      "usage": {
                        "promptTokens": 2,
                        "totalTokens": 2
                      }
                    }
                  ]
                }
                """.formatted(QUERY_ID, vector());
    }

    private List<Double> vector() {
        return java.util.stream.IntStream.range(0, 1536)
                .mapToObj(index -> index == 0 ? 0.1d : 0.0d)
                .toList();
    }
}
