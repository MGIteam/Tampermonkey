# Changelog
Wszystkie znaczące zmiany w projekcie IAI Message Templates System będą dokumentowane w tym pliku.
Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.5.0] - 2025-08-26
### Dodano
- System przesunięć czasowych dla zmiennych dat ({{CURRENT_DATE+7}}, {{CURRENT_DATE+1M}})
- Obsługa jednostek czasowych: H(godziny), D(dni), W(tygodnie), M(miesiące), Q(kwartały), Y(lata)
- Nowe zmienne klienta: {{CLIENT_FIRSTNAME}} i {{CLIENT_LASTNAME}}
- Reorganizacja zmiennych na logiczne sekcje w edytorze szablonów
- Poprawa źródła danych dla {{CLIENT_NAME}} - teraz pobiera imię i nazwisko z post-creator

### Zmieniono
- {{CLIENT_NAME}} teraz zawiera imię i nazwisko klienta zamiast nazwy firmy
- Źródło danych {{CLIENT_NAME}} zmienione z concerns na element post-creator w message-client
- Podział zmiennych na sekcje: dane ticketu, dane klienta (osoby), dane firmy, supervision
- Logika parsowania imienia/nazwiska z automatycznym podziałem na części

### Naprawiono
- Błąd literowy "clizentName" w funkcji extractFormData()
- Duplikowanie danych między CLIENT_NAME i CLIENT_COMPANY_NAME
- Redundantne przypisanie zmiennych w kodzie

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
- Konflikty CSS ze stylami systemu IAI

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
