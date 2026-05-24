from services.translation_service import (
    generate_multilingual_queries
)

queries = generate_multilingual_queries(
    "Attack on USA"
)

print(queries)