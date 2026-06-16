package com.memento;

import com.memento.feature.auth.AuthSignupService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@ActiveProfiles("local")
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
})
class MementoApplicationTests {

    @MockitoBean
    private AuthSignupService authSignupService;

    @MockitoBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoads() {
    }
}
