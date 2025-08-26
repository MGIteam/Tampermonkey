# Changelog
Wszystkie znaczące zmiany w projekcie IAI Message Templates System będą dokumentowane w tym pliku.
Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.5.0] - 2025-08-26
### Dodano
- **System rozpoznawania płci CLIENT_GENDER** - automatyczne rozpoznawanie płci na podstawie imienia (zwraca "Panu"/"Pani")
- **Zmienna {{CURSOR}}** - pozwala precyzyjnie określić pozycję kursora po wczytaniu szablonu
- **Rozszerzona baza polskich imion** - 687 imion (344 męskie + 343 żeńskie) pobierana z GitHub
- **System cache dla bazy imion** - cache na 24h z automatycznym odświeżaniem
- **Fallback offline dla imion** - zapasowa baza 75 imion na wypadek problemów z GitHub
- System przesunięć czasowych dla zmiennych dat ({{CURRENT_DATE+7}}, {{CURRENT_DATE+1M}})
- Obsługa jednostek czasowych: H(godziny), D(dni), W(tygodnie), M(miesiące), Q(kwartały), Y(lata)
- Nowe zmienne klienta: {{CLIENT_FIRSTNAME}}, {{CLIENT_LASTNAME}}, {{CLIENT_GENDER}}
- Reorganizacja zmiennych na logiczne sekcje w edytorze szablonów
- Poprawa źródła danych dla {{CLIENT_NAME}} - teraz pobiera imię i nazwisko z post-creator
- **Heurystyki językowe** - rozpoznawanie płci na podstawie polskich końcówek imion

### Zmieniono
- **Funkcje async** - extractFormData() i powiązane funkcje są teraz asynchroniczne
- {{CLIENT_NAME}} teraz zawiera imię i nazwisko klienta zamiast nazwy firmy
- Źródło danych {{CLIENT_NAME}} zmienione z concerns na element post-creator w message-client
- Podział zmiennych na sekcje: dane ticketu, dane klienta (osoby), dane firmy, supervision
- Logika parsowania imienia/nazwiska z automatycznym podziałem na części
- **System replaceVariables()** - zwraca obiekt z treścią i pozycją kursora
- **Ulepszone pozycjonowanie kursora** - automatyczne ustawienie na końcu jeśli brak {{CURSOR}}

### Naprawiono
- Błąd literowy "clizentName" w funkcji extractFormData()
- Duplikowanie danych między CLIENT_NAME i CLIENT_COMPANY_NAME
- Redundantne przypisanie zmiennych w kodzie
- **Obsługa błędów sieci** - graceful handling gdy GitHub niedostępny
- **Normalizacja polskich znaków** - właściwe przetwarzanie ą, ć, ę, ł, ń, ó, ś, ź, ż

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
