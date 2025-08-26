# Changelog

Wszystkie znaczące zmiany w projekcie IAI Message Templates System będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.4.0] - 2025-08-26

### Dodano
- Timestamp w powiadomieniu startowym pokazuje dokładny czas uruchomienia
- System changelog z automatycznym pobieraniem z GitHub
- Lepsze debugowanie procesu aktualizacji w konsoli

### Poprawiono
- Stabilność cache dla aktualizacji z GitHub Raw URLs
- Timing pokazywania powiadomień po aktualizacji

## [1.3.0] - 2025-08-25

### Dodano
- System eksportu szablonów do plików JSON z metadanymi
- System importu szablonów z walidacją i wyborem trybu scalania
- Kompletny manager szablonów z interfejsem graficznym
- Funkcja testowania szablonów z podglądem zastąpionych zmiennych
- Wszystkie zmienne klienta IAI (firma, ID sklepu, plan, projekty)
- Zmienne supervision i design (support supervisor, webpage supervisor)
- Zmienne czasowe (data, czas, data+czas)

### Zmieniono
- Przepisano system zapisywania szablonów dla lepszej stabilności
- Nowy interfejs użytkownika z modalami i lepszą nawigacją
- Optymalizacja z-index dla kompatybilności z systemem IAI

### Naprawiono
- Problem z podwójnym kodowaniem JSON w storage
- Błędy parsowania szablonów po aktualizacji
- Konfllikty CSS ze stylami systemu IAI

## [1.2.0] - 2025-08-20

### Dodano
- Zmienne klienta: {{CLIENT_PLAN}}, {{CLIENT_SUPPORTED_BY}}
- Funkcja podglądu szablonów przed wczytaniem
- Walidacja poprawności zmiennych w szablonach

### Poprawiono
- Stabilność zapisywania dużych szablonów
- Wydajność wczytywania listy szablonów

## [1.1.0] - 2025-08-15

### Dodano
- Podstawowe zmienne: {{TICKET_ID}}, {{CLIENT_NAME}}, {{PRIORITY}}
- System zapisywania szablonów w localStorage przeglądarki
- Selektor szablonów w formularzu ticketu

### Naprawiono
- Kompatybilność z różnymi selektorami textarea
- Problem z inicjalizacją na różnych podstronach IAI

## [1.0.0] - 2025-08-10

### Dodano
- Pierwsza wersja systemu szablonów wiadomości
- Podstawowy interfejs dodawania i usuwania szablonów
- Integracja z formularzem ticketów IAI
