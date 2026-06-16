package com.memento.feature.embedding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class FastApiEmbeddingClientTest {

    private static final UUID REQUEST_ID =
            UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID JOB_ID =
            UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID CHUNK_ID =
            UUID.fromString("33333333-3333-3333-3333-333333333333");

    @Test
    void createEmbeddingsPostsInternalEmbeddingRequestContract() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        EmbeddingProperties properties = new EmbeddingProperties();
        properties.setBaseUrl("http://ai-server:8000");
        FastApiEmbeddingClient client = new FastApiEmbeddingClient(restTemplate, properties);

        server.expect(requestTo("http://ai-server:8000/internal/v1/embeddings"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json(
                        """
                        {
                          "requestId": "11111111-1111-1111-1111-111111111111",
                          "jobId": "22222222-2222-2222-2222-222222222222",
                          "idempotencyKey": "memory-reindex:22222222-2222-2222-2222-222222222222",
                          "inputType": "memory_chunk",
                          "items": [
                            {
                              "id": "33333333-3333-3333-3333-333333333333",
                              "text": "Memory chunk text"
                            }
                          ]
                        }
                        """))
                .andRespond(withSuccess(
                        """
                        {
                          "provider": "mock",
                          "model": "text-embedding-3-small",
                          "dimension": 1536,
                          "embeddings": [
                            {
                              "id": "33333333-3333-3333-3333-333333333333",
                              "vector": [0.1, 0.2],
                              "usage": {
                                "promptTokens": 3,
                                "totalTokens": 3
                              }
                            }
                          ]
                        }
                        """,
                        MediaType.APPLICATION_JSON));

        EmbeddingResponse response = client.createEmbeddings(new EmbeddingRequest(
                REQUEST_ID,
                JOB_ID,
                "memory-reindex:" + JOB_ID,
                List.of(new EmbeddingInputChunk(CHUNK_ID, "Memory chunk text"))));

        assertThat(response.provider()).isEqualTo("mock");
        assertThat(response.model()).isEqualTo("text-embedding-3-small");
        assertThat(response.dimension()).isEqualTo(1536);
        assertThat(response.embeddings()).hasSize(1);
        assertThat(response.embeddings().get(0).id()).isEqualTo(CHUNK_ID);

        server.verify();
    }
}
