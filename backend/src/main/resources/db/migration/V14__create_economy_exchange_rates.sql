CREATE TABLE economy_exchange_rates (
    currency_code VARCHAR(20) PRIMARY KEY,
    currency_name VARCHAR(120) NOT NULL,
    base_date DATE NOT NULL,
    deal_base_rate VARCHAR(80) NOT NULL,
    ttb VARCHAR(80) NOT NULL,
    tts VARCHAR(80) NOT NULL,
    source_name VARCHAR(160) NOT NULL,
    source_url VARCHAR(700) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_economy_exchange_rates_base_date
    ON economy_exchange_rates(base_date DESC);

CREATE INDEX idx_economy_exchange_rates_updated_at
    ON economy_exchange_rates(updated_at DESC);
