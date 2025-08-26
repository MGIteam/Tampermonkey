// ==UserScript==
// @name         IAI Message Templates System - COMPLETE VERSION
// @namespace    https://github.com/MGIteam/Tampermonkey
// @version      1.4.0
// @description  System szablonów wiadomości ze zmiennymi dla systemu IAI z eksportem/importem
// @author       Maciej Dobroń
// @match        https://*.iai-system.com/panel/tickets.php?action=ins&ticketId=*
// @match        https://*.iai-shop.com/panel/tickets.php?action=ins&ticketId=*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/MGIteam/Tampermonkey/main/IAI-Message-Templates-System/iai-templates.user.js
// @downloadURL  https://raw.githubusercontent.com/MGIteam/Tampermonkey/main/IAI-Message-Templates-System/iai-templates.user.js
// @supportURL   https://github.com/MGIteam/Tampermonkey/issues
// @homepageURL  https://github.com/MGIteam/Tampermonkey
// ==/UserScript==

(function() {
    'use strict';

    console.log("IAI Templates: Uruchamianie systemu szablonów v1.3.1 (COMPLETE)");

    // Sprawdź czy jesteśmy na właściwej stronie
    if (!document.querySelector('table.main#main_table_id') && !document.querySelector('form')) {
        console.log("IAI Templates: Nie znaleziono formularza ticketu");
        return;
    }

    // ============================================================================
    // KONFIGURACJA I ZMIENNE GLOBALNE
    // ============================================================================

    const TEMPLATES_KEY = 'iai_message_templates';
    const Z_INDEX_BASE = 1999998;

    // Zmienne dla systemu changelog
    const CURRENT_VERSION = '1.4.0';
    const LAST_VERSION_KEY = 'iai_last_version';
    const CHANGELOG_URL = 'https://raw.githubusercontent.com/MGIteam/Tampermonkey/main/IAI-Message-Templates-System/CHANGELOG.md';

    // Fallback changelog na wypadek problemów z GitHub
    const FALLBACK_CHANGELOG = {
        '1.4.0': [
            'Dodano timestamp w powiadomieniu startowym',
            'Implementowano system changelog z pobieraniem z GitHub',
            'Poprawiono stabilność cache dla aktualizacji'
        ],
        '1.3.0': [
            'Wersja COMPLETE - pełna funkcjonalność systemu szablonów',
            'Dodano system eksportu/importu szablonów JSON',
            'Nowy zaawansowany manager szablonów',
            'Wszystkie zmienne klienta IAI'
        ]
    };

    let cachedTemplates = null;
    let formData = {};

    // ============================================================================
    // SYSTEM CHANGELOG
    // ============================================================================

    async function fetchChangelogFromGitHub() {
        try {
            console.log('IAI Templates: Pobieranie changelog z GitHub...');
            const response = await fetch(CHANGELOG_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const markdownText = await response.text();
            console.log('IAI Templates: Pobrano changelog z GitHub');
            return parseMarkdownChangelog(markdownText);
            
        } catch (error) {
            console.warn('IAI Templates: Nie można pobrać changelog z GitHub:', error);
            console.log('IAI Templates: Używam fallback changelog');
            return FALLBACK_CHANGELOG;
        }
    }

    function parseMarkdownChangelog(markdown) {
        const changelog = {};
        const lines = markdown.split('\n');
        let currentVersion = null;
        let currentChanges = [];
        
        for (let line of lines) {
            line = line.trim();
            
            // Szukaj nagłówków wersji: ## [1.3.1] - 2025-08-26
            const versionMatch = line.match(/^##\s*\[?(\d+\.\d+\.\d+)\]?/);
            if (versionMatch) {
                // Zapisz poprzednią wersję jeśli istnieje
                if (currentVersion && currentChanges.length > 0) {
                    changelog[currentVersion] = [...currentChanges];
                }
                
                currentVersion = versionMatch[1];
                currentChanges = [];
                continue;
            }
            
            // Szukaj zmian: - Dodano coś
            const changeMatch = line.match(/^[-*]\s+(.+)$/);
            if (changeMatch && currentVersion) {
                currentChanges.push(changeMatch[1]);
            }
        }
        
        // Zapisz ostatnią wersję
        if (currentVersion && currentChanges.length > 0) {
            changelog[currentVersion] = [...currentChanges];
        }
        
        console.log('IAI Templates: Sparsowano changelog:', Object.keys(changelog));
        return changelog;
    }

    async function checkForUpdates() {
        console.log('IAI Templates: Sprawdzanie aktualizacji...');
        const lastVersion = GM_getValue(LAST_VERSION_KEY, '0.0.0');
        
        if (lastVersion !== CURRENT_VERSION) {
            console.log('IAI Templates: Wykryto aktualizację z', lastVersion, 'do', CURRENT_VERSION);
            
            try {
                // Pobierz changelog z GitHub
                const changelog = await fetchChangelogFromGitHub();
                
                // Znajdź wersje do pokazania
                const versionsToShow = getVersionsToShow(lastVersion, CURRENT_VERSION, changelog);
                
                if (versionsToShow.length > 0) {
                    // Opóźnij pokazanie changelog
                    setTimeout(() => {
                        showChangelogModal(versionsToShow, changelog);
                    }, 3000);
                }
                
            } catch (error) {
                console.error('IAI Templates: Błąd podczas sprawdzania aktualizacji:', error);
            }
            
            // Zapisz aktualną wersję
            GM_setValue(LAST_VERSION_KEY, CURRENT_VERSION);
        } else {
            console.log('IAI Templates: Brak aktualizacji - wersja', CURRENT_VERSION);
        }
    }

    function getVersionsToShow(oldVersion, newVersion, changelog) {
        // Jeśli to pierwsza instalacja, pokaż tylko aktualną wersję
        if (oldVersion === '0.0.0') {
            return [newVersion];
        }
        
        // Zwraca wszystkie wersje nowsze niż ostatnia
        return Object.keys(changelog).filter(version => {
            return compareVersions(version, oldVersion) > 0 && 
                   compareVersions(version, newVersion) <= 0;
        }).sort(compareVersions);
    }

    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 !== part2) return part1 - part2;
        }
        return 0;
    }

    function showChangelogModal(versions, changelog) {
        console.log('IAI Templates: Pokazuję changelog dla wersji:', versions);
        
        const isFirstInstall = versions.length === 1 && GM_getValue(LAST_VERSION_KEY, '0.0.0') === '0.0.0';
        
        const changelogContent = versions.map(version => {
            const changes = changelog[version] || ['Brak szczegółów zmian'];
            return `
            <div style="margin-bottom: 16px; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 6px;">
                <h4 style="margin: 0 0 10px 0; color: #007bff; font-size: 16px; font-weight: 600;">
                    Wersja ${version} ${version === CURRENT_VERSION ? '(aktualna)' : ''}
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #333;">
                    ${changes.map(change => 
                        `<li style="margin-bottom: 5px; line-height: 1.4;">${escapeHtml(change)}</li>`
                    ).join('')}
                </ul>
            </div>`;
        }).join('');

        const modal = document.createElement('div');
        modal.className = 'iai-modal-overlay';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 2999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        `;

        modal.innerHTML = `
            <div class="iai-modal" style="
                background: white !important;
                border-radius: 8px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                max-width: 650px !important;
                max-height: 80vh !important;
                overflow-y: auto !important;
                margin: 20px !important;
                min-width: 500px !important;
                z-index: 3000000 !important;
                position: relative !important;
            ">
                <div class="iai-modal-header" style="
                    padding: 20px 24px 16px 24px !important;
                    border-bottom: 1px solid #dee2e6 !important;
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    background: white !important;
                    border-radius: 8px 8px 0 0 !important;
                ">
                    <h3 style="margin: 0; color: #333; font-size: 20px; font-weight: 600;">
                        ${isFirstInstall ? 
                            'System szablonów IAI został zainstalowany!' : 
                            'System szablonów IAI został zaktualizowany!'
                        }
                    </h3>
                    <button type="button" onclick="this.closest('.iai-modal-overlay').remove()" style="
                        background: none !important; 
                        border: none !important; 
                        font-size: 24px !important; 
                        cursor: pointer !important; 
                        color: #666 !important;
                        padding: 0 !important;
                        width: 32px !important;
                        height: 32px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 50% !important;
                        transition: all 0.2s !important;
                    ">×</button>
                </div>
                <div style="padding: 20px 24px;">
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.5;">
                        ${isFirstInstall ? 
                            'Dziękujemy za instalację! Sprawdź funkcje dostępne w tej wersji:' :
                            'Sprawdź co nowego w najnowszej wersji:'
                        }
                    </p>
                    ${changelogContent}
                    <div style="margin-top: 20px; padding: 12px; background: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 6px; font-size: 12px; color: #0066cc;">
                        <strong>Jak korzystać:</strong> Przejdź na stronę ticketu IAI - pod polem tekstowym znajdziesz selektor szablonów i przycisk "Zarządzaj".
                    </div>
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #dee2e6; text-align: right; background: #fafbfc; border-radius: 0 0 8px 8px;">
                    <button type="button" onclick="this.closest('.iai-modal-overlay').remove()" style="
                        padding: 8px 16px; 
                        background: #28a745; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer; 
                        font-size: 14px;
                        font-weight: 500;
                        transition: background-color 0.2s;
                    " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                        Rozumiem
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ============================================================================
    // FUNKCJE TESTOWE - MUSZĄ BYĆ PRZED INNYMI FUNKCJAMI
    // ============================================================================

    function testGMStorage() {
        console.log('IAI Templates: ===== TESTOWANIE GM STORAGE =====');

        try {
            // Test zapisu
            console.log('IAI Templates: Test 1 - Zapis testowej wartości...');
            const testData = {
                test: true,
                timestamp: Date.now(),
                message: 'Test GM_setValue/GM_getValue'
            };

            GM_setValue('iai_templates_test', JSON.stringify(testData));
            console.log('IAI Templates: GM_setValue wykonany - zapisano:', testData);

            // Test odczytu
            console.log('IAI Templates: Test 2 - Odczyt testowej wartości...');
            const retrieved = GM_getValue('iai_templates_test', '{}');
            console.log('IAI Templates: GM_getValue zwrócił:', typeof retrieved, retrieved);

            // Test parsowania
            const parsed = JSON.parse(retrieved);
            console.log('IAI Templates: Sparsowane dane:', parsed);

            if (parsed.test === true && parsed.message === testData.message) {
                console.log('IAI Templates: ✅ GM STORAGE DZIAŁA POPRAWNIE!');

                // Wyczyść test
                GM_setValue('iai_templates_test', '');
                return true;
            } else {
                console.error('IAI Templates: ❌ GM STORAGE - dane nie pasują!');
                console.error('IAI Templates: Oczekiwano:', testData);
                console.error('IAI Templates: Otrzymano:', parsed);
                return false;
            }

        } catch (error) {
            console.error('IAI Templates: ❌ BŁĄD GM STORAGE:', error);
            return false;
        }
    }

    function debugExistingTemplates() {
        console.log('IAI Templates: ===== DEBUG ISTNIEJĄCYCH SZABLONÓW =====');

        try {
            const stored = GM_getValue(TEMPLATES_KEY, '[]');
            console.log('IAI Templates: Raw stored value:', stored);
            console.log('IAI Templates: Type:', typeof stored);
            console.log('IAI Templates: Length:', stored.length);

            const parsed = JSON.parse(stored);
            console.log('IAI Templates: Parsed:', parsed);
            console.log('IAI Templates: Is array:', Array.isArray(parsed));
            console.log('IAI Templates: Templates count:', parsed.length);

            if (parsed.length > 0) {
                console.log('IAI Templates: First template:', parsed[0]);
            }

            return parsed;

        } catch (error) {
            console.error('IAI Templates: Błąd podczas debug szablonów:', error);
            return [];
        }
    }

    // ============================================================================
    // FUNKCJE GLOBALNE (NA GÓRZE!)
    // ============================================================================

    window.IAI_Templates = {
        editTemplate: function(id) {
            console.log('IAI Templates: Edytuj szablon:', id);
            openTemplateEditor(id);
        },

        previewTemplate: function(id) {
            console.log('IAI Templates: Podgląd szablonu:', id);
            const templates = getTemplates();
            const template = templates.find(t => t.id === id);
            if (!template) {
                console.error('IAI Templates: Nie znaleziono szablonu o ID:', id);
                return;
            }

            formData = extractFormData();
            const processedContent = replaceVariables(template.content, formData);

            const modal = document.createElement('div');
            modal.className = 'iai-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 2999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;

            modal.innerHTML = `
                <div class="iai-modal" style="
                    background: white !important;
                    border-radius: 8px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                    max-width: 800px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    margin: 20px !important;
                    min-width: 600px !important;
                    z-index: 3000000 !important;
                    position: relative !important;
                ">
                    <div class="iai-modal-header" style="
                        padding: 16px 20px !important;
                        border-bottom: 1px solid #dee2e6 !important;
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        background: white !important;
                        border-radius: 8px 8px 0 0 !important;
                        z-index: 3000001 !important;
                        position: relative !important;
                    ">
                        <h3 class="iai-modal-title" style="margin: 0; font-size: 18px; font-weight: 600; color: #333;">👁️ Podgląd: ${escapeHtml(template.name)}</h3>
                        <button type="button" class="iai-modal-close" onclick="this.closest('.iai-modal-overlay').remove()" style="
                            background: none !important;
                            border: none !important;
                            font-size: 24px !important;
                            cursor: pointer !important;
                            color: #666 !important;
                            padding: 0 !important;
                            width: 32px !important;
                            height: 32px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            border-radius: 50% !important;
                            z-index: 3000002 !important;
                            position: relative !important;
                            transition: all 0.2s !important;
                        ">×</button>
                    </div>
                    <div class="iai-modal-body" style="
                        padding: 20px !important;
                        background: white !important;
                        z-index: 3000001 !important;
                        position: relative !important;
                    ">
                        <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 16px; border-radius: 4px; white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.5; max-height: 400px; overflow-y: auto;">
${escapeHtml(processedContent)}
                        </div>
                    </div>
                    <div class="iai-modal-footer" style="
                        padding: 16px 20px !important;
                        border-top: 1px solid #dee2e6 !important;
                        display: flex !important;
                        justify-content: flex-end !important;
                        gap: 10px !important;
                        background: white !important;
                        border-radius: 0 0 8px 8px !important;
                        z-index: 3000001 !important;
                        position: relative !important;
                    ">
                        <button type="button" class="iai-template-btn secondary" onclick="this.closest('.iai-modal-overlay').remove()" style="
                            padding: 6px 12px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 11px;
                            z-index: 3000002 !important;
                            position: relative !important;
                        ">Zamknij</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        deleteTemplateConfirm: function(id) {
            console.log('IAI Templates: Usuń szablon:', id);
            const templates = getTemplates();
            const template = templates.find(t => t.id === id);
            if (!template) {
                console.error('IAI Templates: Nie znaleziono szablonu o ID:', id);
                return;
            }

            if (confirm(`Czy na pewno chcesz usunąć szablon "${template.name}"?\n\nTej operacji nie można cofnąć.`)) {
                deleteTemplate(id);
                refreshTemplateList();
                refreshTemplateSelector();
                showNotification(`🗑️ Usunięto szablon: ${template.name}`, false);
            }
        },

        insertVariable: function(variable) {
            const textarea = document.getElementById('templateContent');
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;

            textarea.value = text.substring(0, start) + variable + text.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + variable.length, start + variable.length);
        },

exportTemplates: function() {
    console.log('IAI Templates: Eksport szablonów...');

    try {
        cachedTemplates = null;

        let raw = GM_getValue(TEMPLATES_KEY, '[]');
        let templates = JSON.parse(raw);

        while (typeof templates === 'string') {
            templates = JSON.parse(templates);
        }

        if (!Array.isArray(templates) || templates.length === 0) {
            showNotification('⚠️ Brak szablonów do eksportu!', true);
            return;
        }

        const templatesFormatted = templates.map(t => {
            return `    {
      "id": ${JSON.stringify(t.id)},
      "name": ${JSON.stringify(t.name)},
      "content": ${JSON.stringify(t.content)},
      "created": ${JSON.stringify(t.created || '')},
      "updated": ${JSON.stringify(t.updated || '')}
    }`;
        }).join(',\n');

        const manualJsonString = `{
  "version": "1.0",
  "exported": "${new Date().toISOString()}",
  "templates": [
${templatesFormatted}
  ],
  "count": ${templates.length}
}`;

        const blob = new Blob([manualJsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Utwórz link, kliknij i zostaw - NIE usuwaj
        const a = document.createElement('a');
        a.href = url;
        a.download = `iai-templates-${new Date().toISOString().split('T')[0]}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        // Zwolnij tylko URL po czasie
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        showNotification(`📥 Wyeksportowano ${templates.length} szablonów`, false);

    } catch (error) {
        console.error('IAI Templates: Błąd:', error);
        showNotification('❌ Błąd eksportu!', true);
    }
},
        importTemplates: function() {
            console.log('IAI Templates: Import szablonów...');

            // Utwórz niewidoczny input file
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';

            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;

                console.log('IAI Templates: Wybrano plik:', file.name);

                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const importData = JSON.parse(e.target.result);

                        // Walidacja struktury pliku
                        if (!importData.templates) {
                            throw new Error('Brak pola "templates" w pliku JSON');
                        }

                        // Sprawdź czy templates to string (błąd eksportu) i napraw
                        let templates = importData.templates;

                        // Sprawdź tylko jeśli rzeczywiście jest to string (stare pliki)
                        if (typeof templates === 'string') {
                            console.log('IAI Templates: Wykryto stary format eksportu, konwertuję...');
                            try {
                                templates = JSON.parse(templates);
                            } catch (e) {
                                console.error('IAI Templates: Nie można sparsować templates:', e);
                                showNotification('❌ Uszkodzony plik importu!', true);
                                return;
                            }
                        }

                        // Walidacja
                        if (!Array.isArray(templates)) {
                            console.error('IAI Templates: Templates nie jest tablicą');
                            showNotification('❌ Nieprawidłowy format pliku!', true);
                            return;
                        }

                        if (!Array.isArray(templates)) {
                            throw new Error('Pole "templates" nie jest tablicą');
                        }

                        // Zaktualizuj dane importu z naprawionymi templates
                        importData.templates = templates;

                        // Pokaż dialog potwierdzenia
                        window.IAI_Templates.showImportDialog(importData);

                    } catch (error) {
                        console.error('IAI Templates: Błąd parsowania pliku:', error);
                        showNotification('❌ Błędny format pliku JSON: ' + error.message, true);
                    }
                };

                reader.onerror = function() {
                    console.error('IAI Templates: Błąd odczytu pliku');
                    showNotification('❌ Nie można odczytać pliku!', true);
                };

                reader.readAsText(file);
            });

            // Kliknij niewidoczny input
            document.body.appendChild(fileInput);
            fileInput.click();
            document.body.removeChild(fileInput);
        },

        showImportDialog: function(importData) {
            const templates = importData.templates;
            const currentTemplates = getTemplates();

            // Sprawdź konflikty (szablony o tych samych nazwach)
            const conflicts = templates.filter(newTemplate =>
                currentTemplates.some(existing => existing.name === newTemplate.name)
            );

            const modal = document.createElement('div');
            modal.className = 'iai-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 2999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;

            modal.innerHTML = `
                <div class="iai-modal" style="
                    background: white !important;
                    border-radius: 8px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                    max-width: 600px !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    margin: 20px !important;
                    min-width: 500px !important;
                    z-index: 3000000 !important;
                    position: relative !important;
                ">
                    <div class="iai-modal-header">
                        <h3 class="iai-modal-title">📥 Import szablonów</h3>
                        <button type="button" class="iai-modal-close" onclick="this.closest('.iai-modal-overlay').remove()">×</button>
                    </div>
                    <div class="iai-modal-body" style="padding: 20px;">
                        <div style="margin-bottom: 16px; padding: 12px; background: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 6px;">
                            <strong>📋 Informacje o pliku:</strong><br>
                            • Wersja: ${importData.version || 'nieznana'}<br>
                            • Data eksportu: ${importData.exported ? new Date(importData.exported).toLocaleString('pl-PL') : 'nieznana'}<br>
                            • Liczba szablonów: ${templates.length}<br>
                            • Obecne szablony: ${currentTemplates.length}
                        </div>

                        ${conflicts.length > 0 ? `
                            <div style="margin-bottom: 16px; padding: 12px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                                <strong>⚠️ Wykryto konflikty nazw!</strong><br>
                                Następujące szablony mają takie same nazwy jak istniejące:<br>
                                ${conflicts.map(t => `• ${escapeHtml(t.name)}`).join('<br>')}
                            </div>
                        ` : ''}

                        <div style="margin-bottom: 16px;">
                            <strong>Szablony do zaimportowania:</strong>
                            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px; margin-top: 8px;">
                                ${templates.map((template, index) => `
                                    <div style="padding: 4px 0; ${conflicts.some(c => c.name === template.name) ? 'color: #856404; font-weight: bold;' : ''}">
                                        ${index + 1}. ${escapeHtml(template.name)}
                                        ${template.content ? ` (${template.content.length} znaków)` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-weight: bold; margin-bottom: 8px;">Sposób importu:</label>
                            <label style="display: block; margin-bottom: 8px;">
                                <input type="radio" name="importMode" value="add" checked style="margin-right: 8px;">
                                Dodaj nowe szablony (zachowaj istniejące, dodaj nowe ID dla konfliktów)
                            </label>
                            <label style="display: block; margin-bottom: 8px;">
                                <input type="radio" name="importMode" value="replace" style="margin-right: 8px;">
                                Zastąp wszystkie szablony (usuń obecne, wczytaj z pliku)
                            </label>
                            <label style="display: block;">
                                <input type="radio" name="importMode" value="merge" style="margin-right: 8px;">
                                Scal szablony (aktualizuj istniejące, dodaj nowe)
                            </label>
                        </div>
                    </div>
                    <div class="iai-modal-footer">
                        <button type="button" class="iai-template-btn secondary" onclick="this.closest('.iai-modal-overlay').remove()">Anuluj</button>
                        <button type="button" class="iai-template-btn success" id="confirmImport">Importuj</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event listener dla przycisku importu
            document.getElementById('confirmImport').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const mode = modal.querySelector('input[name="importMode"]:checked').value;
                window.IAI_Templates.performImport(templates, mode);
                modal.remove();
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        },

        performImport: function(importTemplates, mode) {
            console.log('IAI Templates: Wykonuję import w trybie:', mode);

            try {
                let currentTemplates = getTemplates();
                let newTemplates = [];
                let imported = 0;
                let updated = 0;

                switch (mode) {
                    case 'replace':
                        // Zastąp wszystkie szablony
                        newTemplates = importTemplates.map(template => ({
                            ...template,
                            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                            imported: new Date().toISOString()
                        }));
                        imported = newTemplates.length;
                        break;

                    case 'add':
                        // Dodaj wszystkie jako nowe (z nowymi ID)
                        newTemplates = [...currentTemplates];
                        importTemplates.forEach(template => {
                            const newTemplate = {
                                ...template,
                                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                                imported: new Date().toISOString()
                            };
                            // Jeśli nazwa konfliktuje, dodaj sufiks
                            if (newTemplates.some(existing => existing.name === template.name)) {
                                newTemplate.name = template.name + ' (imported)';
                            }
                            newTemplates.push(newTemplate);
                            imported++;
                        });
                        break;

                    case 'merge':
                        // Scal szablony
                        newTemplates = [...currentTemplates];
                        importTemplates.forEach(template => {
                            const existingIndex = newTemplates.findIndex(existing => existing.name === template.name);
                            if (existingIndex >= 0) {
                                // Aktualizuj istniejący
                                newTemplates[existingIndex] = {
                                    ...template,
                                    id: newTemplates[existingIndex].id, // zachowaj stare ID
                                    updated: new Date().toISOString()
                                };
                                updated++;
                            } else {
                                // Dodaj nowy
                                newTemplates.push({
                                    ...template,
                                    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                                    imported: new Date().toISOString()
                                });
                                imported++;
                            }
                        });
                        break;
                }

                // Zapisz szablony
                GM_setValue(TEMPLATES_KEY, JSON.stringify(newTemplates));
                cachedTemplates = newTemplates;
                const success = true;

                if (success) {
                    console.log('IAI Templates: Import zakończony pomyślnie');

                    let message = '';
                    if (mode === 'replace') {
                        message = `✅ Zaimportowano ${imported} szablonów (zastąpiono wszystkie)`;
                    } else if (mode === 'add') {
                        message = `✅ Dodano ${imported} nowych szablonów`;
                    } else if (mode === 'merge') {
                        message = `✅ Zaimportowano ${imported} nowych, zaktualizowano ${updated} istniejących`;
                    }

                    showNotification(message, false);

                    // Odśwież interfejs
                    refreshTemplateList();
                    refreshTemplateSelector();

                } else {
                    throw new Error('Nie udało się zapisać szablonów');
                }

            } catch (error) {
                console.error('IAI Templates: Błąd podczas importu:', error);
                showNotification('❌ Błąd podczas importu szablonów!', true);
            }
        }
    };

    // ============================================================================
    // SYSTEM ZMIENNYCH - POPRAWIONY
    // ============================================================================

    function extractFormData() {
        console.log('IAI Templates: Rozpoczynam wyciąganie danych z formularza...');

        const data = {
            // Podstawowe zmienne
            ticketId: '',
            priority: '',
            assignedTo: '',
            dateCreated: '',
            concerns: '',
            ticketTitle: '',

            // Zmienne klienta - osoby kontaktowej
            clientName: '',           // Pełne imię i nazwisko
            clientFirstName: '',      // Samo imię
            clientLastName: '',       // Samo nazwisko

            // Zmienne firmy klienta
            clientCompanyName: '',
            clientShopId: '',
            clientPlan: '',
            clientActiveProject: '',
            clientPackage: '',
            clientSupportedBy: '',
            clientSupportSupervisor: '',
            clientWebpageSupervisor: '',
            clientTemplateDesign: '',
            clientTemplateCoding: '',

            // Zmienne czasowe
            currentDateTime: new Date().toLocaleString('pl-PL'),
            currentDate: new Date().toLocaleDateString('pl-PL'),
            currentTime: new Date().toLocaleTimeString('pl-PL')
        };

        try {
            // POBIERZ NUMER TICKETU
            const urlMatch = window.location.href.match(/ticketId=(\d+)/);
            if (urlMatch) {
                data.ticketId = urlMatch[1];
                console.log('IAI Templates: Ticket ID z URL:', data.ticketId);
            }

            // Alternatywnie z nagłówka h1
            const ticketHeader = document.querySelector('h1');
            if (ticketHeader && !data.ticketId) {
                const headerMatch = ticketHeader.textContent.match(/Ticket #(\d+)/);
                if (headerMatch) {
                    data.ticketId = headerMatch[1];
                    console.log('IAI Templates: Ticket ID z nagłówka:', data.ticketId);
                }
            }

            // POBIERZ TYTUŁ TICKETU z nagłówka h1
            if (ticketHeader) {
                const titleMatch = ticketHeader.textContent.match(/Ticket #\d+ - (.+?)$/);
                if (titleMatch) {
                    data.ticketTitle = titleMatch[1].trim();
                    console.log('IAI Templates: Tytuł ticketu:', data.ticketTitle);
                }
            }

            // POBIERZ DATĘ UTWORZENIA z pierwszego postu
            const firstPostCreator = document.querySelector('#post-creator-0');
            if (firstPostCreator) {
                const parentDiv = firstPostCreator.closest('.ticketHead');
                if (parentDiv) {
                    const dateMatch = parentDiv.textContent.match(/on:\s*([0-9]{2}\.[0-9]{2}\.[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2})/);
                    if (dateMatch) {
                        data.dateCreated = dateMatch[1];
                        console.log('IAI Templates: Data utworzenia:', data.dateCreated);
                    }
                }
            }

            // POBIERZ PRIORYTET z selecta
            const prioritySelect = document.querySelector('#fg_newPriority');
            if (prioritySelect && prioritySelect.selectedIndex >= 0) {
                const selectedOption = prioritySelect.options[prioritySelect.selectedIndex];
                if (selectedOption && selectedOption.textContent.trim() !== 'unassigned') {
                    data.priority = selectedOption.textContent.trim();
                    console.log('IAI Templates: Priorytet:', data.priority);
                }
            }

            // POBIERZ ASSIGNED TO z selecta
            const assignedSelect = document.querySelector('#fg_assigned');
            if (assignedSelect && assignedSelect.selectedIndex >= 0) {
                const selectedOption = assignedSelect.options[assignedSelect.selectedIndex];
                if (selectedOption) {
                    data.assignedTo = selectedOption.textContent.trim();
                    console.log('IAI Templates: Assigned to:', data.assignedTo);
                }
            }

            // POBIERZ DANE KLIENTA Z SEKCJI "CONCERNS"
            const concernsRow = Array.from(document.querySelectorAll('tr')).find(row => {
                const firstCell = row.cells[0];
                return firstCell && firstCell.textContent.trim() === 'Concerns';
            });

            if (concernsRow && concernsRow.cells[1]) {
                const concernsCell = concernsRow.cells[1];
                data.concerns = concernsCell.textContent.trim();
                console.log('IAI Templates: Raw concerns:', data.concerns);

                // NAJPIERW: Wyciągnij nazwę FIRMY z pierwszego linku
                const companyLink = concernsCell.querySelector('a[title="View client-specific data and notes"]');
                if (companyLink) {
                    data.clientCompanyName = companyLink.textContent.trim();
                    console.log('IAI Templates: Nazwa firmy:', data.clientCompanyName);
                } else {
                    console.warn('IAI Templates: Nie znaleziono linku do danych firmy');
                }

                // Wyciągnij shop ID z drugiego linku
                const shopLink = concernsCell.querySelector('a[onclick*="showShopNotes"]');
                if (shopLink) {
                    const shopSpan = shopLink.querySelector('span[title]');
                    if (shopSpan) {
                        const titleMatch = shopSpan.title.match(/id klienta: (\d+), sklep: (\d+)/);
                        if (titleMatch) {
                            data.clientShopId = titleMatch[1];
                            console.log('IAI Templates: Shop ID:', data.clientShopId);
                        }
                    }
                }

                // Wyciągnij szczegóły z div.concerns-details
                const detailsDiv = concernsCell.querySelector('.concerns-details');
                if (detailsDiv) {
                    const concernsItems = detailsDiv.querySelectorAll('.concerns-item');

                    concernsItems.forEach(item => {
                        const text = item.textContent.trim();

                        if (text.includes('Plan:')) {
                            data.clientPlan = text.replace('Plan:', '').trim();
                            console.log('IAI Templates: Plan:', data.clientPlan);
                        }

                        if (text.includes('Supported by:')) {
                            data.clientSupportedBy = text.replace('Supported by:', '').trim();
                            console.log('IAI Templates: Supported by:', data.clientSupportedBy);
                        }

                        if (text.includes('Support supervisor:')) {
                            data.clientSupportSupervisor = text.replace('Support supervisor:', '').trim();
                            console.log('IAI Templates: Support supervisor:', data.clientSupportSupervisor);
                        }

                        if (text.includes('Webpage supervisor:')) {
                            data.clientWebpageSupervisor = text.replace('Webpage supervisor:', '').trim();
                            console.log('IAI Templates: Webpage supervisor:', data.clientWebpageSupervisor);
                        }

                        if (text.includes('project in progress:')) {
                            const projectMatch = text.match(/project in progress:\s*(\d+)/);
                            if (projectMatch) {
                                data.clientActiveProject = projectMatch[1];
                                console.log('IAI Templates: Active project:', data.clientActiveProject);
                            }
                        }

                        if (text.includes('Package:')) {
                            data.clientPackage = text.replace('Package:', '').trim();
                            console.log('IAI Templates: Package:', data.clientPackage);
                        }

                        if (text.includes('Template design:')) {
                            data.clientTemplateDesign = text.replace('Template design:', '').trim();
                            console.log('IAI Templates: Template design:', data.clientTemplateDesign);
                        }

                        if (text.includes('Template coding:')) {
                            data.clientTemplateCoding = text.replace('Template coding:', '').trim();
                            console.log('IAI Templates: Template coding:', data.clientTemplateCoding);
                        }
                    });
                }
            }

            // TERAZ: Próbuj pobrać IMIĘ I NAZWISKO KLIENTA z różnych miejsc
            console.log('IAI Templates: === DEBUG: Szukanie imienia i nazwiska klienta ===');
            
            // Metoda 1: Szukaj w td.row2.message-client
            let foundClientName = false;
            const messageClientCell = document.querySelector('td.row2.message-client');
            console.log('IAI Templates: messageClientCell znaleziona:', !!messageClientCell);
            
            if (messageClientCell) {
                // Spróbuj znaleźć post-creator w tej komórce
                const postCreatorElement = messageClientCell.querySelector('b[id^="post-creator-"]');
                console.log('IAI Templates: postCreatorElement znaleziony:', !!postCreatorElement);
                
                if (postCreatorElement) {
                    const fullName = postCreatorElement.textContent.trim();
                    console.log('IAI Templates: Znaleziono fullName w message-client:', fullName);
                    
                    if (fullName && fullName.length > 0) {
                        data.clientName = fullName;
                        foundClientName = true;
                        
                        // Rozdziel na imię i nazwisko
                        const nameParts = fullName.split(' ').filter(part => part.length > 0);
                        if (nameParts.length >= 1) {
                            data.clientFirstName = nameParts[0];
                        }
                        if (nameParts.length >= 2) {
                            data.clientLastName = nameParts.slice(1).join(' ');
                        }
                        
                        console.log('IAI Templates: Ustawiono z message-client - Imię:', data.clientFirstName, 'Nazwisko:', data.clientLastName);
                    }
                }
            }

            // Metoda 2: Jeśli nie znaleziono, szukaj dowolnego post-creator
            if (!foundClientName) {
                console.log('IAI Templates: Nie znaleziono w message-client, szukam dowolnego post-creator...');
                
                // Znajdź wszystkie post-creator elementy
                const allPostCreators = document.querySelectorAll('b[id^="post-creator-"]');
                console.log('IAI Templates: Znaleziono post-creator elementów:', allPostCreators.length);
                
                for (let i = 0; i < allPostCreators.length; i++) {
                    const element = allPostCreators[i];
                    const fullName = element.textContent.trim();
                    console.log(`IAI Templates: post-creator-${i}:`, fullName);
                    
                    // Użyj pierwszego niepustego
                    if (fullName && fullName.length > 0 && !foundClientName) {
                        data.clientName = fullName;
                        foundClientName = true;
                        
                        // Rozdziel na imię i nazwisko
                        const nameParts = fullName.split(' ').filter(part => part.length > 0);
                        if (nameParts.length >= 1) {
                            data.clientFirstName = nameParts[0];
                        }
                        if (nameParts.length >= 2) {
                            data.clientLastName = nameParts.slice(1).join(' ');
                        }
                        
                        console.log('IAI Templates: Ustawiono z post-creator - Pełne:', data.clientName, 'Imię:', data.clientFirstName, 'Nazwisko:', data.clientLastName);
                        break;
                    }
                }
            }

            // Metoda 3: Fallback - jeśli nadal nie znaleziono, użyj clientCompanyName jako clientName (dla kompatybilności)
            if (!foundClientName && data.clientCompanyName) {
                console.log('IAI Templates: Fallback - używam clientCompanyName jako clientName dla kompatybilności');
                data.clientName = data.clientCompanyName;
                
                // Spróbuj podzielić również na imię/nazwisko jeśli to brzmi jak imię
                const nameParts = data.clientCompanyName.split(' ').filter(part => part.length > 0);
                if (nameParts.length >= 2 && nameParts.length <= 4) { // Prawdopodobnie imię i nazwisko
                    data.clientFirstName = nameParts[0];
                    data.clientLastName = nameParts.slice(1).join(' ');
                    console.log('IAI Templates: Fallback parsing - Imię:', data.clientFirstName, 'Nazwisko:', data.clientLastName);
                }
            }

            console.log('IAI Templates: === FINAL CLIENT DATA ===');
            console.log('IAI Templates: clientName (pełne):', data.clientName);
            console.log('IAI Templates: clientFirstName:', data.clientFirstName);
            console.log('IAI Templates: clientLastName:', data.clientLastName);
            console.log('IAI Templates: clientCompanyName (firma):', data.clientCompanyName);

        } catch (error) {
            console.error('IAI Templates: Błąd podczas pobierania danych formularza:', error);
        }

        return data;
    }

    function replaceVariables(template, data) {
        let result = template;

        // Podstawowe zmienne statyczne (bez przesunięć)
        const staticVariables = {
            // Podstawowe zmienne ticketu
            '{{TICKET_ID}}': data.ticketId || '',
            '{{TICKET_TITLE}}': data.ticketTitle || '',
            '{{PRIORITY}}': data.priority || '',
            '{{ASSIGNED_TO}}': data.assignedTo || '',
            '{{DATE_CREATED}}': data.dateCreated || '',
            '{{CONCERNS}}': data.concerns || '',

            // Zmienne klienta - osoby kontaktowej
            '{{CLIENT_NAME}}': data.clientName || '',
            '{{CLIENT_FIRSTNAME}}': data.clientFirstName || '',
            '{{CLIENT_LASTNAME}}': data.clientLastName || '',

            // Zmienne firmy klienta
            '{{CLIENT_COMPANY_NAME}}': data.clientCompanyName || '',
            '{{CLIENT_SHOP_ID}}': data.clientShopId || '',
            '{{CLIENT_PLAN}}': data.clientPlan || '',
            '{{CLIENT_ACTIVE_PROJECT}}': data.clientActiveProject || '',
            '{{CLIENT_PACKAGE}}': data.clientPackage || '',
            '{{CLIENT_SUPPORTED_BY}}': data.clientSupportedBy || '',
            '{{CLIENT_SUPPORT_SUPERVISOR}}': data.clientSupportSupervisor || '',
            '{{CLIENT_WEBPAGE_SUPERVISOR}}': data.clientWebpageSupervisor || '',
            '{{CLIENT_TEMPLATE_DESIGN}}': data.clientTemplateDesign || '',
            '{{CLIENT_TEMPLATE_CODING}}': data.clientTemplateCoding || '',

            // Zmienne czasowe - podstawowe (bez przesunięć)
            '{{CURRENT_DATETIME}}': data.currentDateTime || '',
            '{{CURRENT_DATE}}': data.currentDate || '',
            '{{CURRENT_TIME}}': data.currentTime || ''
        };

        // 1. Najpierw zastąp zmienne statyczne
        Object.entries(staticVariables).forEach(([variable, value]) => {
            const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
            result = result.replace(regex, value);
        });

        // 2. Następnie obsłuż zmienne czasowe z przesunięciami
        result = replaceDateShiftVariables(result);

        console.log('IAI Templates: Zastąpiono zmienne w szablonie');
        return result;
    }

    function replaceDateShiftVariables(text) {
        // Regex dla zmiennych z przesunięciami czasowymi:
        // {{CURRENT_DATE+7}}, {{CURRENT_DATE-3}}, {{CURRENT_DATE+1M}}, {{CURRENT_DATETIME+2Y}} itd.
        const dateShiftRegex = /\{\{(CURRENT_DATE|CURRENT_DATETIME|CURRENT_TIME)([+-])(\d+)([DMYQWH]?)\}\}/g;
        
        return text.replace(dateShiftRegex, (match, dateType, operator, amount, unit) => {
            try {
                const currentDate = new Date();
                const shiftAmount = parseInt(amount);
                const isAdd = operator === '+';
                
                console.log(`IAI Templates: Przetwarzanie ${match} - typ: ${dateType}, operator: ${operator}, ilość: ${shiftAmount}, jednostka: ${unit || 'D'}`);
                
                // Zastosuj przesunięcie
                const shiftedDate = applyDateShift(currentDate, shiftAmount, unit || 'D', isAdd);
                
                // Sformatuj według typu zmiennej
                switch(dateType) {
                    case 'CURRENT_DATE':
                        return shiftedDate.toLocaleDateString('pl-PL');
                    case 'CURRENT_TIME':
                        return shiftedDate.toLocaleTimeString('pl-PL');
                    case 'CURRENT_DATETIME':
                        return shiftedDate.toLocaleString('pl-PL');
                    default:
                        return shiftedDate.toLocaleString('pl-PL');
                }
            } catch (error) {
                console.error('IAI Templates: Błąd podczas przetwarzania przesunięcia czasowego:', error);
                return match; // Zwróć oryginalną zmienną jeśli błąd
            }
        });
    }

    function applyDateShift(date, amount, unit, isAdd) {
        const result = new Date(date);
        const multiplier = isAdd ? 1 : -1;
        const shiftValue = amount * multiplier;

        switch(unit.toUpperCase()) {
            case 'H': // Godziny
                result.setHours(result.getHours() + shiftValue);
                break;
            case 'D': // Dni (domyślne)
            case '':
                result.setDate(result.getDate() + shiftValue);
                break;
            case 'W': // Tygodnie
                result.setDate(result.getDate() + (shiftValue * 7));
                break;
            case 'M': // Miesiące
                result.setMonth(result.getMonth() + shiftValue);
                break;
            case 'Q': // Kwartały
                result.setMonth(result.getMonth() + (shiftValue * 3));
                break;
            case 'Y': // Lata
                result.setFullYear(result.getFullYear() + shiftValue);
                break;
            default:
                // Jeśli nie rozpoznano jednostki, traktuj jako dni
                result.setDate(result.getDate() + shiftValue);
        }

        console.log(`IAI Templates: Przesunięto datę o ${shiftValue} ${unit || 'D'}: ${date.toLocaleString('pl-PL')} → ${result.toLocaleString('pl-PL')}`);
        return result;
    }

    // ============================================================================
    // ZARZĄDZANIE SZABLONAMI - POPRAWIONE
    // ============================================================================

    function getTemplates() {
        // console.log('IAI Templates: Pobieranie szablonów...');

        if (cachedTemplates !== null && Array.isArray(cachedTemplates)) {
            // console.log('IAI Templates: Zwracam z cache:', cachedTemplates.length, 'elementów');
            return cachedTemplates;
        }

        try {
            const storedValue = GM_getValue(TEMPLATES_KEY, '[]');
            // console.log('IAI Templates: Raw data type:', typeof storedValue);
            // console.log('IAI Templates: Raw data preview:', storedValue.substring(0, 100));

            let parsed;

            if (typeof storedValue === 'string') {
                if (storedValue.trim() === '' || storedValue.trim() === '[]') {
                    parsed = [];
                } else {
                    let tempParsed = JSON.parse(storedValue);

                    if (typeof tempParsed === 'string') {
                        // console.log('IAI Templates: Wykryto podwójne kodowanie, naprawiam...');
                        parsed = JSON.parse(tempParsed);
                    } else {
                        parsed = tempParsed;
                    }
                }
            } else if (Array.isArray(storedValue)) {
                parsed = storedValue;
            } else {
                // console.error('IAI Templates: Nieoczekiwany typ danych, resetuję');
                GM_setValue(TEMPLATES_KEY, '[]');
                cachedTemplates = [];
                return [];
            }

            // console.log('IAI Templates: Parsed type:', typeof parsed);
            // console.log('IAI Templates: Is array:', Array.isArray(parsed));
            // console.log('IAI Templates: Parsed data:', parsed);

            if (!Array.isArray(parsed)) {
                // console.error('IAI Templates: Parsed data nie jest tablicą! Resetuję.');
                // console.error('IAI Templates: Actual parsed:', parsed);
                GM_setValue(TEMPLATES_KEY, '[]');
                cachedTemplates = [];
                return [];
            }

            cachedTemplates = parsed;
            // console.log('IAI Templates: Zwracam', parsed.length, 'szablonów');
            return parsed;

        } catch (error) {
            console.error('IAI Templates: Błąd parsowania:', error);
            GM_setValue(TEMPLATES_KEY, '[]');
            cachedTemplates = [];
            return [];
        }
    }

    function saveTemplates(templates) {
        console.log('IAI Templates: saveTemplates - rozpoczynam zapis:', templates);

        if (!Array.isArray(templates)) {
            console.error('IAI Templates: Próba zapisania nie-tablicy!', templates);
            return false;
        }

        try {
            // Upewnij się, że templates to czysta tablica obiektów
            // (bez dodatkowego opakowania w string)
            let cleanTemplates = templates;

            // Jeśli przypadkiem templates już jest stringiem, napraw to
            if (typeof templates === 'string') {
                console.warn('IAI Templates: Otrzymano string zamiast tablicy, próbuję naprawić...');
                cleanTemplates = JSON.parse(templates);
            }

            // Sprawdź jeszcze raz
            if (!Array.isArray(cleanTemplates)) {
                console.error('IAI Templates: Po naprawie wciąż nie jest tablicą!');
                return false;
            }

            // Konwertuj do JSON tylko RAZ
            const jsonString = JSON.stringify(cleanTemplates);

            // Debug - sprawdź co zapisujemy
            console.log('IAI Templates: Zapisuję', cleanTemplates.length, 'szablonów');
            console.log('IAI Templates: Typ danych do zapisu:', typeof jsonString);
            console.log('IAI Templates: JSON do zapisu (pierwsze 200 znaków):', jsonString.substring(0, 200));

            // Sprawdź czy nie ma podwójnego kodowania
            try {
                const testParse = JSON.parse(jsonString);
                if (typeof testParse === 'string') {
                    // console.error('IAI Templates: UWAGA! Wykryto podwójne kodowanie JSON!');
                    // Jeśli tak, zapisz rozpakowaną wersję
                    GM_setValue(TEMPLATES_KEY, testParse);
                } else {
                    // Normalny zapis
                    GM_setValue(TEMPLATES_KEY, jsonString);
                }
            } catch (e) {
                // Jeśli nie da się sparsować, zapisz jak jest
                GM_setValue(TEMPLATES_KEY, jsonString);
            }

            console.log('IAI Templates: GM_setValue wykonany pomyślnie');

            // Test odczytu zaraz po zapisie
            const testRead = GM_getValue(TEMPLATES_KEY, '[]');
            console.log('IAI Templates: Test odczytu po zapisie - typ:', typeof testRead);
            console.log('IAI Templates: Test odczytu po zapisie (pierwsze 100 znaków):', testRead.substring(0, 100));

            // Zaktualizuj cache z czystymi danymi (tablica, nie string!)
            cachedTemplates = cleanTemplates;

            console.log('IAI Templates: Zapisano szablony pomyślnie:', cleanTemplates.length);
            return true;

        } catch (e) {
            console.error('IAI Templates: BŁĄD podczas zapisywania:', e);
            return false;
        }
    }

    function addTemplate(name, content) {
        console.log('IAI Templates: addTemplate - dodaję szablon:', name);

        const templates = getTemplates();
        console.log('IAI Templates: Obecne szablony przed dodaniem:', templates.length);

        const newTemplate = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            content: content.trim(),
            created: new Date().toISOString()
        };

        templates.push(newTemplate);
        console.log('IAI Templates: Tablica po dodaniu:', templates.length);

        const success = saveTemplates(templates);
        if (success) {
            console.log('IAI Templates: Dodano nowy szablon pomyślnie:', newTemplate.name);
            return newTemplate;
        } else {
            console.error('IAI Templates: Nie udało się zapisać szablonu');
            return null;
        }
    }

    function updateTemplate(id, name, content) {
        console.log('IAI Templates: updateTemplate - aktualizuję szablon:', id);

        const templates = getTemplates();
        const index = templates.findIndex(t => t.id === id);

        if (index !== -1) {
            templates[index].name = name.trim();
            templates[index].content = content.trim();
            templates[index].modified = new Date().toISOString();

            const success = saveTemplates(templates);
            if (success) {
                console.log('IAI Templates: Zaktualizowano szablon:', templates[index].name);
                return templates[index];
            } else {
                console.error('IAI Templates: Nie udało się zaktualizować szablonu');
                return null;
            }
        }
        console.error('IAI Templates: Nie znaleziono szablonu do aktualizacji:', id);
        return null;
    }

    function deleteTemplate(id) {
        console.log('IAI Templates: deleteTemplate - usuwam szablon:', id);

        const templates = getTemplates();
        const template = templates.find(t => t.id === id);
        const filteredTemplates = templates.filter(t => t.id !== id);

        const success = saveTemplates(filteredTemplates);
        if (success) {
            console.log('IAI Templates: Usunięto szablon:', template ? template.name : id);
        } else {
            console.error('IAI Templates: Nie udało się usunąć szablonu');
        }
    }

    // ============================================================================
    // STYLOWANIE
    // ============================================================================

    function addStyles() {
        GM_addStyle(`
            /* Template Selector Styles */
            .iai-template-container {
                margin: 8px 0;
                border-top: 1px solid #dee2e6;
                padding-top: 8px;
            }

            .iai-template-row {
                display: flex;
                gap: 8px;
                align-items: center;
                margin-bottom: 8px;
            }

            .iai-template-select {
                flex: 1;
                padding: 6px 10px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 11px;
                background: white;
                cursor: pointer;
            }

            .iai-template-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .iai-template-btn.primary {
                background: #007bff;
                color: white;
            }

            .iai-template-btn.primary:hover {
                background: #0056b3;
            }

            .iai-template-btn.success {
                background: #28a745;
                color: white;
            }

            .iai-template-btn.success:hover {
                background: #1e7e34;
            }

            .iai-template-btn.secondary {
                background: #6c757d;
                color: white;
            }

            .iai-template-btn.secondary:hover {
                background: #545b62;
            }

            .iai-template-btn.danger {
                background: #dc3545;
                color: white;
            }

            .iai-template-btn.danger:hover {
                background: #c82333;
            }

            /* Modal Styles - BARDZO WYSOKIE Z-INDEX */
            .iai-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.6) !important;
                z-index: 1999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            .iai-modal {
                background: white !important;
                border-radius: 8px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                max-width: 800px !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                margin: 20px !important;
                min-width: 600px !important;
                z-index: 2000000 !important;
                position: relative !important;
            }

            .iai-modal-header {
                padding: 16px 20px !important;
                border-bottom: 1px solid #dee2e6 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                background: white !important;
                border-radius: 8px 8px 0 0 !important;
                z-index: 2000001 !important;
            }

            .iai-modal-title {
                margin: 0 !important;
                font-size: 18px !important;
                font-weight: 600 !important;
                color: #333 !important;
            }

            .iai-modal-close {
                background: none !important;
                border: none !important;
                font-size: 24px !important;
                cursor: pointer !important;
                color: #666 !important;
                padding: 0 !important;
                width: 32px !important;
                height: 32px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 2000002 !important;
                border-radius: 50% !important;
                transition: all 0.2s !important;
                position: relative !important;
            }

            .iai-modal-close:hover {
                background: #f8f9fa !important;
                color: #333 !important;
            }

            .iai-modal-body {
                padding: 20px !important;
                background: white !important;
                z-index: 2000001 !important;
                position: relative !important;
            }

            .iai-modal-footer {
                padding: 16px 20px !important;
                border-top: 1px solid #dee2e6 !important;
                display: flex !important;
                justify-content: flex-end !important;
                gap: 10px !important;
                background: white !important;
                border-radius: 0 0 8px 8px !important;
                z-index: 2000001 !important;
                position: relative !important;
            }

            .iai-template-list {
                max-height: 350px;
                overflow-y: auto;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                background: white;
            }

            .iai-template-item {
                padding: 14px 16px;
                border-bottom: 1px solid #f1f3f5;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background-color 0.15s;
            }

            .iai-template-item:last-child {
                border-bottom: none;
            }

            .iai-template-item:hover {
                background: #f8f9fa;
            }

            /* Specjalne reguły dla przycisków w modalach */
            .iai-modal button {
                z-index: 2000002 !important;
                position: relative !important;
            }

            .iai-modal input, .iai-modal textarea {
                z-index: 2000001 !important;
                position: relative !important;
            }

            /* Styles for variable items */
            .iai-variable-item {
                background: white !important;
                padding: 4px 8px !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 3px !important;
                font-family: 'Courier New', monospace !important;
                font-size: 10px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                text-align: center !important;
                display: inline-block !important;
                margin: 2px !important;
            }

            .iai-variable-item:hover {
                background: #e7f3ff !important;
                border-color: #007bff !important;
                transform: translateY(-1px) !important;
            }

            /* Improved form styling */
            .iai-form-input {
                width: 100% !important;
                padding: 8px 12px !important;
                border: 1px solid #ced4da !important;
                border-radius: 4px !important;
                font-size: 13px !important;
                box-sizing: border-box !important;
                transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
            }

            .iai-form-input:focus {
                border-color: #007bff !important;
                outline: 0 !important;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
            }

            .iai-form-textarea {
                width: 100% !important;
                height: 250px !important;
                padding: 12px !important;
                border: 1px solid #ced4da !important;
                border-radius: 4px !important;
                font-size: 13px !important;
                font-family: 'Courier New', monospace !important;
                resize: vertical !important;
                box-sizing: border-box !important;
                line-height: 1.4 !important;
                transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out !important;
            }

            .iai-form-textarea:focus {
                border-color: #007bff !important;
                outline: 0 !important;
                box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
            }

            /* Variables help section */
            .iai-variables-help {
                background: #f8f9fa !important;
                border: 1px solid #e9ecef !important;
                border-radius: 6px !important;
                padding: 12px !important;
                margin-bottom: 16px !important;
                font-size: 12px !important;
                max-height: 300px !important;
                overflow-y: auto !important;
            }

            .iai-variables-help h4 {
                margin: 0 0 10px 0 !important;
                color: #495057 !important;
                font-size: 13px !important;
                font-weight: 600 !important;
            }

            /* Animacje */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .iai-modal {
                animation: fadeIn 0.3s ease-out !important;
            }

            /* Empty state styling */
            .iai-empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #6c757d;
            }

            .iai-empty-state p {
                margin: 8px 0;
                font-size: 14px;
            }

            .iai-empty-state .emoji {
                font-size: 32px;
                margin-bottom: 12px;
                display: block;
            }
        `);
    }

    // ============================================================================
    // INTERFACE UŻYTKOWNIKA - POPRAWIONY
    // ============================================================================

    function createTemplateSelector() {
        console.log('IAI Templates: createTemplateSelector - start');

        // Sprawdź różne możliwe selektory dla textarea
        const possibleSelectors = [
            '#fg_insert',
            'textarea[name="fg_insert"]',
            'textarea[id="fg_insert"]',
            'textarea'
        ];

        let textarea = null;

        for (const selector of possibleSelectors) {
            textarea = document.querySelector(selector);
            if (textarea) {
                console.log('IAI Templates: Znaleziono textarea za pomocą selektora:', selector);
                break;
            }
        }

        if (!textarea) {
            console.log('IAI Templates: Nie znaleziono textarea - przeszukuję wszystkie');
            const allTextareas = document.querySelectorAll('textarea');
            console.log('IAI Templates: Znaleziono', allTextareas.length, 'textarea elementów');

            for (let i = 0; i < allTextareas.length; i++) {
                const ta = allTextareas[i];
                console.log(`IAI Templates: Textarea ${i}:`, {
                    id: ta.id,
                    name: ta.name,
                    className: ta.className,
                    placeholder: ta.placeholder
                });
            }

            // Użyj pierwszej textarea jako fallback
            if (allTextareas.length > 0) {
                textarea = allTextareas[0];
                console.log('IAI Templates: Używam pierwszej textarea jako fallback');
            }
        }

        if (!textarea) {
            console.log('IAI Templates: Nie znaleziono żadnej textarea - rezygnuję');
            return;
        }

        // Sprawdź czy selector już został dodany
        if (textarea.dataset.templatesAdded) {
            console.log('IAI Templates: Selector już dodany do tej textarea');
            return;
        }

        console.log('IAI Templates: Znaleziono textarea, dodaję selector...');
        textarea.dataset.templatesAdded = 'true';

        // Znajdź rodzica (td lub div) gdzie możemy dodać selector
        let parentContainer = textarea.parentElement;

        // Jeśli textarea jest w td, wstaw selector po textarea
        if (parentContainer && parentContainer.tagName.toLowerCase() === 'td') {
            console.log('IAI Templates: Textarea jest w TD - dodaję selector po textarea');
        } else {
            // Szukaj właściwego kontenera
            while (parentContainer && !['td', 'div', 'form'].includes(parentContainer.tagName.toLowerCase())) {
                parentContainer = parentContainer.parentElement;
            }
            console.log('IAI Templates: Znaleziono kontener:', parentContainer ? parentContainer.tagName : 'brak');
        }

        if (!parentContainer) {
            console.error('IAI Templates: Nie znaleziono odpowiedniego kontenera dla selektora');
            return;
        }

        // Utwórz kontener dla selektora szablonów
        const templateContainer = document.createElement('div');
        templateContainer.className = 'iai-template-container';
        templateContainer.style.cssText = `
            margin: 8px 0;
            border-top: 1px solid #dee2e6;
            padding-top: 8px;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
        `;

        templateContainer.innerHTML = `
            <div class="iai-template-row" style="display: flex; gap: 8px; align-items: center;">
                <select class="iai-template-select" id="templateSelect" style="
                    flex: 1;
                    padding: 6px 10px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    font-size: 11px;
                    background: white;
                    cursor: pointer;
                ">
                    <option value="">📝 Wybierz szablon wiadomości...</option>
                </select>
                <button type="button" class="iai-template-btn success" id="loadTemplate" style="
                    padding: 6px 12px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s;
                ">Wczytaj</button>
                <button type="button" class="iai-template-btn primary" id="manageTemplates" style="
                    padding: 6px 12px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s;
                ">Zarządzaj</button>
            </div>
        `;

        // Wstaw po textarea
        if (textarea.nextSibling) {
            parentContainer.insertBefore(templateContainer, textarea.nextSibling);
        } else {
            parentContainer.appendChild(templateContainer);
        }
        console.log('IAI Templates: Dodano HTML selector');

        // Wypełnij listę szablonów
        try {
            refreshTemplateSelector();
        } catch (error) {
            console.error('IAI Templates: Błąd podczas refreshTemplateSelector:', error);
        }

        // Event listenery z debugowaniem
        const loadBtn = document.getElementById('loadTemplate');
        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                console.log('IAI Templates: Kliknięto Wczytaj');
                e.preventDefault();
                e.stopPropagation();
                try {
                    loadSelectedTemplate();
                } catch (error) {
                    console.error('IAI Templates: Błąd w loadSelectedTemplate:', error);
                }
            });
            console.log('IAI Templates: Dodano event listener dla Wczytaj');
        } else {
            console.error('IAI Templates: Nie znaleziono przycisku loadTemplate');
        }

        const manageBtn = document.getElementById('manageTemplates');
        if (manageBtn) {
            manageBtn.addEventListener('click', (e) => {
                console.log('IAI Templates: KLIKNIĘTO ZARZĄDZAJ!!!');
                e.preventDefault();
                e.stopPropagation();
                try {
                    openTemplateManager();
                } catch (error) {
                    console.error('IAI Templates: Błąd w openTemplateManager:', error);
                }
            });
            console.log('IAI Templates: Dodano event listener dla Zarządzaj');
        } else {
            console.error('IAI Templates: Nie znaleziono przycisku manageTemplates');
        }

        console.log('IAI Templates: createTemplateSelector - koniec pomyślnie');
    }

    function refreshTemplateSelector() {
        console.log('IAI Templates: refreshTemplateSelector - start');

        const select = document.getElementById('templateSelect');
        if (!select) {
            console.error('IAI Templates: Nie znaleziono elementu templateSelect');
            return;
        }

        console.log('IAI Templates: Znaleziono select element');

        try {
            const templates = getTemplates();
            console.log('IAI Templates: Pobrano templates:', typeof templates, Array.isArray(templates), templates.length);

            if (!Array.isArray(templates)) {
                console.error('IAI Templates: templates nie jest tablicą!', templates);
                select.innerHTML = '<option value="">❌ Błąd ładowania szablonów</option>';
                return;
            }

            select.innerHTML = '<option value="">📝 Wybierz szablon wiadomości...</option>';

            templates.forEach((template, index) => {
                console.log(`IAI Templates: Dodaję szablon ${index}:`, template.name);
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = template.name;
                select.appendChild(option);
            });

            console.log('IAI Templates: Odświeżono selektor szablonów, dostępne:', templates.length);

        } catch (error) {
            console.error('IAI Templates: Błąd w refreshTemplateSelector:', error);
            select.innerHTML = '<option value="">❌ Błąd ładowania szablonów</option>';
        }
    }

    function loadSelectedTemplate() {
        console.log('IAI Templates: loadSelectedTemplate - start');

        const select = document.getElementById('templateSelect');
        if (!select || !select.value) {
            console.log('IAI Templates: Nie wybrano szablonu do wczytania');
            showNotification('⚠️ Najpierw wybierz szablon z listy!', true);
            return;
        }

        // Znajdź textarea - sprawdź różne możliwe selektory
        let textarea = null;
        const possibleSelectors = [
            '#fg_insert',
            'textarea[name="fg_insert"]',
            'textarea[id="fg_insert"]',
            'textarea'
        ];

        for (const selector of possibleSelectors) {
            textarea = document.querySelector(selector);
            if (textarea) {
                console.log('IAI Templates: Znaleziono textarea za pomocą:', selector);
                break;
            }
        }

        if (!textarea) {
            console.error('IAI Templates: Nie znaleziono textarea do wczytania szablonu');
            showNotification('❌ Nie znaleziono pola tekstowego!', true);
            return;
        }

        const templates = getTemplates();
        const template = templates.find(t => t.id === select.value);

        if (!template) {
            console.error('IAI Templates: Nie znaleziono szablonu o ID:', select.value);
            showNotification('❌ Nie znaleziono wybranego szablonu!', true);
            return;
        }

        console.log('IAI Templates: Wczytywanie szablonu:', template.name);

        try {
            // Pobierz aktualne dane formularza
            formData = extractFormData();
            console.log('IAI Templates: Wyciągnięte dane formularza:', formData);

            // Zastąp zmienne w szablonie
            const processedContent = replaceVariables(template.content, formData);
            console.log('IAI Templates: Przetworzony szablon (pierwsze 200 znaków):', processedContent.substring(0, 200));

            // Wczytaj do textarea
            textarea.value = processedContent;
            textarea.focus();

            // Wywołaj eventy żeby inne skrypty wiedziały o zmianie
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new Event('keyup', { bubbles: true }));

            console.log('IAI Templates: Szablon wczytany pomyślnie');
            showNotification(`✅ Wczytano szablon: ${template.name}`, false);

            // Reset selektora
            select.selectedIndex = 0;

        } catch (error) {
            console.error('IAI Templates: Błąd podczas wczytywania szablonu:', error);
            showNotification('❌ Błąd podczas wczytywania szablonu!', true);
        }
    }

    function openTemplateManager() {
        console.log('IAI Templates: ===== OTWIERANIE MANAGERA SZABLONÓW =====');

        try {
            // Usuń istniejący modal
            const existing = document.getElementById('templateManagerModal');
            if (existing) {
                console.log('IAI Templates: Usuwam istniejący modal');
                existing.remove();
            }

            console.log('IAI Templates: Tworzę nowy modal...');

            const modal = document.createElement('div');
            modal.id = 'templateManagerModal';
            modal.className = 'iai-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 1999998 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            `;

            modal.innerHTML = `
                <div class="iai-modal" style="
                    background: white !important;
                    border-radius: 8px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                    max-width: 800px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    margin: 20px !important;
                    min-width: 600px !important;
                    z-index: 1999999 !important;
                    position: relative !important;
                ">
                    <div class="iai-modal-header">
                        <h3 class="iai-modal-title">📝 Manager szablonów wiadomości</h3>
                        <button type="button" class="iai-modal-close" id="closeModal">×</button>
                    </div>
                    <div class="iai-modal-body">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                            <h4 style="margin: 0; color: #333; font-size: 16px;">Moje szablony</h4>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button type="button" class="iai-template-btn secondary" id="exportTemplates">📥 Eksport</button>
                                <button type="button" class="iai-template-btn secondary" id="importTemplates">📤 Import</button>
                                <button type="button" class="iai-template-btn success" id="addNewTemplate">+ Nowy szablon</button>
                            </div>
                        </div>
                        <div class="iai-template-list" id="templatesList">
                            <div style="text-align: center; padding: 20px; color: #666;">
                                <p>⏳ Ładowanie szablonów...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            console.log('IAI Templates: Dodaję modal do body');
            document.body.appendChild(modal);

            // Event listeners
            const closeBtn = document.getElementById('closeModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    console.log('IAI Templates: Kliknięto zamknij');
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal();
                });
            }

            const addBtn = document.getElementById('addNewTemplate');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    console.log('IAI Templates: Kliknięto nowy szablon');
                    e.preventDefault();
                    e.stopPropagation();
                    openTemplateEditor();
                });
            }

            // Event listenery dla eksportu/importu
            const exportBtn = document.getElementById('exportTemplates');
            if (exportBtn) {
                exportBtn.addEventListener('click', (e) => {
                    console.log('IAI Templates: Kliknięto eksport');
                    e.preventDefault();
                    e.stopPropagation();
                    window.IAI_Templates.exportTemplates();
                });
            }

            const importBtn = document.getElementById('importTemplates');
            if (importBtn) {
                importBtn.addEventListener('click', (e) => {
                    console.log('IAI Templates: Kliknięto import');
                    e.preventDefault();
                    e.stopPropagation();
                    window.IAI_Templates.importTemplates();
                });
            }

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeModal();
                }
            });

            // Opóźnij wypełnienie listy
            setTimeout(() => {
                try {
                    refreshTemplateList();
                } catch (error) {
                    console.error('IAI Templates: Błąd w refreshTemplateList:', error);
                }
            }, 100);

        } catch (error) {
            console.error('IAI Templates: BŁĄD W OPENTEMPLATMANAGER:', error);
            alert('Błąd podczas otwierania managera szablonów: ' + error.message);
        }
    }

    function refreshTemplateList() {
        console.log('IAI Templates: refreshTemplateList - start');

        const list = document.getElementById('templatesList');
        if (!list) {
            console.error('IAI Templates: Nie znaleziono elementu templatesList');
            return;
        }

        try {
            const templates = getTemplates();
            console.log('IAI Templates: Pobrano templates dla listy:', typeof templates, Array.isArray(templates), templates.length);

            if (!Array.isArray(templates)) {
                console.error('IAI Templates: templates nie jest tablicą w refreshTemplateList!', templates);
                list.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #dc3545;">
                        <p><strong>❌ Błąd ładowania szablonów</strong></p>
                        <p>Sprawdź konsolę developera</p>
                    </div>
                `;
                return;
            }

            if (templates.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p style="font-size: 32px; margin-bottom: 12px;">🗂️</p>
                        <p><strong>Nie masz jeszcze żadnych szablonów</strong></p>
                        <p>Kliknij <strong>"+ Nowy szablon"</strong> aby utworzyć pierwszy!</p>
                    </div>
                `;
                return;
            }

            // Generuj HTML dla szablonów
            const htmlContent = templates.map(template => `
                <div style="
                    padding: 14px 16px;
                    border-bottom: 1px solid #f1f3f5;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div style="flex: 1; min-width: 0; margin-right: 12px;">
                        <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #333;">
                            ${escapeHtml(template.name || 'Bez nazwy')}
                        </h5>
                        <p style="margin: 0; font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml((template.content || '').substring(0, 100))}${(template.content || '').length > 100 ? '...' : ''}
                        </p>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" data-action="edit" data-id="${template.id}" style="
                            padding: 4px 8px; font-size: 10px; background: #6c757d; color: white;
                            border: none; border-radius: 4px; cursor: pointer;
                        ">Edytuj</button>
                        <button type="button" data-action="preview" data-id="${template.id}" style="
                            padding: 4px 8px; font-size: 10px; background: #007bff; color: white;
                            border: none; border-radius: 4px; cursor: pointer;
                        ">Podgląd</button>
                        <button type="button" data-action="delete" data-id="${template.id}" style="
                            padding: 4px 8px; font-size: 10px; background: #dc3545; color: white;
                            border: none; border-radius: 4px; cursor: pointer;
                        ">Usuń</button>
                    </div>
                </div>
            `).join('');

            list.innerHTML = htmlContent;

            // Event listenery dla przycisków akcji
            list.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const action = e.target.dataset.action;
                    const id = e.target.dataset.id;

                    console.log('IAI Templates: Akcja:', action, 'ID:', id);

                    try {
                        switch(action) {
                            case 'edit':
                                window.IAI_Templates.editTemplate(id);
                                break;
                            case 'preview':
                                window.IAI_Templates.previewTemplate(id);
                                break;
                            case 'delete':
                                window.IAI_Templates.deleteTemplateConfirm(id);
                                break;
                            default:
                                console.error('IAI Templates: Nieznana akcja:', action);
                        }
                    } catch (error) {
                        console.error('IAI Templates: Błąd podczas wykonywania akcji:', error);
                    }
                });
            });

        } catch (error) {
            console.error('IAI Templates: Błąd w refreshTemplateList:', error);
            list.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <p><strong>❌ Błąd: ${error.message}</strong></p>
                </div>
            `;
        }
    }

    // ============================================================================
    // EDYTOR SZABLONÓW - KOMPLETNY
    // ============================================================================

    function openTemplateEditor(templateId = null) {
        console.log('IAI Templates: Otwieranie edytora szablonu, ID:', templateId);

        const isEdit = !!templateId;
        const template = isEdit ? getTemplates().find(t => t.id === templateId) : null;

        if (isEdit && !template) {
            console.error('IAI Templates: Nie znaleziono szablonu do edycji:', templateId);
            showNotification('❌ Błąd: Nie znaleziono szablonu do edycji!', true);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'iai-modal-overlay';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 1999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        `;

        modal.innerHTML = `
            <div class="iai-modal" style="
                background: white !important;
                border-radius: 8px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                max-width: 900px !important;
                max-height: 95vh !important;
                overflow-y: auto !important;
                margin: 20px !important;
                min-width: 700px !important;
                z-index: 2000000 !important;
                position: relative !important;
            ">
                <div class="iai-modal-header">
                    <h3 class="iai-modal-title">${isEdit ? '✏️ Edytuj szablon' : '➕ Nowy szablon'}</h3>
                    <button type="button" class="iai-modal-close" id="closeEditorModal">×</button>
                </div>
                <div class="iai-modal-body" style="padding: 20px; background: white;">
                    <div class="iai-variables-help" style="
                        background: #f8f9fa;
                        border: 1px solid #e9ecef;
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 16px;
                        font-size: 12px;
                        max-height: 300px;
                        overflow-y: auto;
                    ">
                        <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 13px; font-weight: 600;">💡 Dostępne zmienne (kliknij aby wstawić do treści):</h4>

                        <div style="margin-bottom: 12px;">
                            <strong style="color: #007bff;">📋 Podstawowe dane ticketu:</strong>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{TICKET_ID}}">{{TICKET_ID}}</span>
                                <span class="iai-variable-item" data-variable="{{TICKET_TITLE}}">{{TICKET_TITLE}}</span>
                                <span class="iai-variable-item" data-variable="{{PRIORITY}}">{{PRIORITY}}</span>
                                <span class="iai-variable-item" data-variable="{{ASSIGNED_TO}}">{{ASSIGNED_TO}}</span>
                                <span class="iai-variable-item" data-variable="{{DATE_CREATED}}">{{DATE_CREATED}}</span>
                                <span class="iai-variable-item" data-variable="{{CONCERNS}}">{{CONCERNS}}</span>
                            </div>
                        </div>

                        <div style="margin-bottom: 12px;">
                            <strong style="color: #28a745;">👥 Dane klienta (osoby kontaktowej):</strong>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{CLIENT_NAME}}">{{CLIENT_NAME}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_FIRSTNAME}}">{{CLIENT_FIRSTNAME}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_LASTNAME}}">{{CLIENT_LASTNAME}}</span>
                            </div>
                        </div>                        

                        <div style="margin-bottom: 12px;">
                            <strong style="color: #17a2b8;">🏢 Dane firmy klienta:</strong>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{CLIENT_COMPANY_NAME}}">{{CLIENT_COMPANY_NAME}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_SHOP_ID}}">{{CLIENT_SHOP_ID}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_PLAN}}">{{CLIENT_PLAN}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_PACKAGE}}">{{CLIENT_PACKAGE}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_ACTIVE_PROJECT}}">{{CLIENT_ACTIVE_PROJECT}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_SUPPORTED_BY}}">{{CLIENT_SUPPORTED_BY}}</span>
                            </div>
                        </div>

                        <div style="margin-bottom: 12px;">
                            <strong style="color: #6f42c1;">⚙️ Supervision i design:</strong>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{CLIENT_SUPPORT_SUPERVISOR}}">{{CLIENT_SUPPORT_SUPERVISOR}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_WEBPAGE_SUPERVISOR}}">{{CLIENT_WEBPAGE_SUPERVISOR}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_TEMPLATE_DESIGN}}">{{CLIENT_TEMPLATE_DESIGN}}</span>
                                <span class="iai-variable-item" data-variable="{{CLIENT_TEMPLATE_CODING}}">{{CLIENT_TEMPLATE_CODING}}</span>
                            </div>
                        </div>

                        <div>
                            <strong style="color: #dc3545;">🕒 Zmienne czasowe:</strong>
                            <div style="margin: 8px 0 4px 0; font-size: 11px; color: #666;">
                                <strong>Podstawowe:</strong>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATETIME}}">{{CURRENT_DATETIME}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE}}">{{CURRENT_DATE}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_TIME}}">{{CURRENT_TIME}}</span>
                            </div>
                            
                            <div style="margin: 12px 0 4px 0; font-size: 11px; color: #666;">
                                <strong>Z przesunięciami czasowymi:</strong>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin: 4px 0;">
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE+1}}">{{CURRENT_DATE+1}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE+7}}">{{CURRENT_DATE+7}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE+1M}}">{{CURRENT_DATE+1M}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE-3}}">{{CURRENT_DATE-3}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE+2W}}">{{CURRENT_DATE+2W}}</span>
                                <span class="iai-variable-item" data-variable="{{CURRENT_DATE+1Y}}">{{CURRENT_DATE+1Y}}</span>
                            </div>
                            
                            <div style="margin-top: 8px; padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 11px; color: #856404;">
                                <strong>💡 Dostępne jednostki przesunięć:</strong><br>
                                • <strong>H</strong> = godziny ({{CURRENT_DATETIME+2H}})<br>
                                • <strong>D</strong> = dni ({{CURRENT_DATE+5}} lub {{CURRENT_DATE+5D}})<br>
                                • <strong>W</strong> = tygodnie ({{CURRENT_DATE+2W}})<br>
                                • <strong>M</strong> = miesiące ({{CURRENT_DATE+3M}})<br>
                                • <strong>Q</strong> = kwartały ({{CURRENT_DATE+1Q}})<br>
                                • <strong>Y</strong> = lata ({{CURRENT_DATE+2Y}})<br>
                                Przykład: {{CURRENT_DATE+14}} = obecna data + 14 dni
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 13px;">Nazwa szablonu <span style="color: #dc3545;">*</span></label>
                        <input type="text" class="iai-form-input" id="templateName"
                               value="${template ? escapeHtml(template.name) : ''}"
                               placeholder="np. Potwierdzenie otrzymania zgłoszenia"
                               maxlength="100" style="
                                   width: 100%;
                                   padding: 8px 12px;
                                   border: 1px solid #ced4da;
                                   border-radius: 4px;
                                   font-size: 13px;
                                   box-sizing: border-box;
                               ">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333; font-size: 13px;">Treść szablonu <span style="color: #dc3545;">*</span></label>
                        <textarea class="iai-form-textarea" id="templateContent"
                                  placeholder="Napisz treść szablonu tutaj...

Możesz używać zmiennych z listy powyżej, na przykład:

Dzień dobry {{CLIENT_COMPANY_NAME}},

Potwierdzam otrzymanie zgłoszenia #{{TICKET_ID}}.
Tytuł: {{TICKET_TITLE}}
Priorytet: {{PRIORITY}}
Plan klienta: {{CLIENT_PLAN}}

Pozdrawiam,
{{ASSIGNED_TO}}
{{CURRENT_DATETIME}}" style="
                                      width: 100%;
                                      height: 250px;
                                      padding: 12px;
                                      border: 1px solid #ced4da;
                                      border-radius: 4px;
                                      font-size: 13px;
                                      font-family: 'Courier New', monospace;
                                      resize: vertical;
                                      box-sizing: border-box;
                                      line-height: 1.4;
                                  ">${template ? escapeHtml(template.content) : ''}</textarea>
                    </div>
                </div>
                <div class="iai-modal-footer">
                    <button type="button" class="iai-template-btn secondary" id="cancelTemplate">Anuluj</button>
                    <button type="button" class="iai-template-btn primary" id="testTemplate">🔍 Testuj</button>
                    <button type="button" class="iai-template-btn success" id="saveTemplate">
                        ${isEdit ? '💾 Zapisz zmiany' : '➕ Utwórz szablon'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners z preventDefault i stopPropagation
        document.getElementById('closeEditorModal').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.remove();
        });

        document.getElementById('cancelTemplate').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.remove();
        });

        document.getElementById('testTemplate').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            testTemplate();
        });

        document.getElementById('saveTemplate').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveTemplate(templateId);
        });

        // Event listenery dla zmiennych - z poprawionym hover efektem
        modal.querySelectorAll('[data-variable]').forEach(item => {
            // Style dla zmiennych
            item.style.cssText = `
                background: white;
                padding: 4px 8px;
                border: 1px solid #dee2e6;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
                display: inline-block;
                margin: 2px;
            `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const variable = item.dataset.variable;
                window.IAI_Templates.insertVariable(variable);
            });

            // Dodaj hover efekt
            item.addEventListener('mouseenter', (e) => {
                e.target.style.background = '#e7f3ff';
                e.target.style.borderColor = '#007bff';
                e.target.style.transform = 'translateY(-1px)';
            });

            item.addEventListener('mouseleave', (e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#dee2e6';
                e.target.style.transform = 'translateY(0)';
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                modal.remove();
            }
        });

        // Focus na nazwę
        setTimeout(() => {
            const nameInput = document.getElementById('templateName');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);

        console.log('IAI Templates: Edytor szablonu został otwarty z z-index:', modal.style.zIndex);
    }

    // ============================================================================
    // FUNKCJA TESTOWANIA SZABLONU
    // ============================================================================

    function testTemplate() {
        const content = document.getElementById('templateContent').value;

        if (!content.trim()) {
            showNotification('❌ Wprowadź treść szablonu do testowania!', true);
            return;
        }

        formData = extractFormData();
        const processedContent = replaceVariables(content, formData);

        const modal = document.createElement('div');
        modal.className = 'iai-modal-overlay';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 2999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        `;
        modal.innerHTML = `
            <div class="iai-modal" style="
                background: white !important;
                border-radius: 8px !important;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
                max-width: 800px !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
                margin: 20px !important;
                min-width: 600px !important;
                z-index: 3000000 !important;
                position: relative !important;
            ">
                <div class="iai-modal-header">
                    <h3 class="iai-modal-title">🧪 Test szablonu</h3>
                    <button type="button" class="iai-modal-close" onclick="this.closest('.iai-modal-overlay').remove()">×</button>
                </div>
                <div class="iai-modal-body">
                    <p><strong>Szablon po przetworzeniu zmiennych:</strong></p>
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 16px; border-radius: 6px; white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.5; max-height: 350px; overflow-y: auto; margin-top: 8px;">
${escapeHtml(processedContent)}
                    </div>
                    ${processedContent !== content ? `
                        <div style="margin-top: 12px; padding: 8px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; font-size: 12px;">
                            <strong>✅ Zmienne zostały pomyślnie zastąpione</strong>
                        </div>
                    ` : `
                        <div style="margin-top: 12px; padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 12px;">
                            <strong>ℹ️ Brak zmiennych do zastąpienia lub brak danych w formularzu</strong>
                        </div>
                    `}

                    <div style="margin-top: 16px; padding: 12px; background: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 4px; font-size: 12px;">
                        <strong>🔍 Sprawdzone zmienne:</strong><br>
                        ${Object.entries({
                            'TICKET_ID': formData.ticketId,
                            'CLIENT_COMPANY_NAME': formData.clientCompanyName,
                            'CLIENT_SHOP_ID': formData.clientShopId,
                            'PRIORITY': formData.priority,
                            'CLIENT_PLAN': formData.clientPlan
                        }).map(([key, value]) =>
                            `• ${key}: ${value || '<puste>'}`
                        ).join('<br>')}
                    </div>
                </div>
                <div class="iai-modal-footer">
                    <button type="button" class="iai-template-btn secondary" onclick="this.closest('.iai-modal-overlay').remove()">Zamknij</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    function saveTemplate(templateId = null) {
        console.log('IAI Templates: saveTemplate - start, templateId:', templateId);

        const name = document.getElementById('templateName').value.trim();
        const content = document.getElementById('templateContent').value.trim();

        if (!name) {
            showNotification('❌ Podaj nazwę szablonu!', true);
            document.getElementById('templateName').focus();
            return;
        }

        if (!content) {
            showNotification('❌ Podaj treść szablonu!', true);
            document.getElementById('templateContent').focus();
            return;
        }

        try {
            let result;

            if (templateId) {
                result = updateTemplate(templateId, name, content);
                if (result) {
                    showNotification(`✅ Zaktualizowano szablon: ${name}`, false);
                } else {
                    showNotification('❌ Wystąpił błąd podczas aktualizacji szablonu!', true);
                    return;
                }
            } else {
                result = addTemplate(name, content);
                if (result) {
                    showNotification(`✅ Utworzono szablon: ${name}`, false);
                } else {
                    showNotification('❌ Wystąpił błąd podczas tworzenia szablonu!', true);
                    return;
                }
            }

            // ZNAJDŹ I ZAMKNIJ OKNO EDYTORA
            console.log('IAI Templates: Próbuję zamknąć okno edytora...');

            // Znajdź overlay edytora (ma najwyższy z-index)
            const editorOverlays = Array.from(document.querySelectorAll('.iai-modal-overlay')).filter(overlay => {
                const modal = overlay.querySelector('.iai-modal');
                if (modal) {
                    const zIndex = parseInt(window.getComputedStyle(overlay).zIndex) || 0;
                    return zIndex >= 1999999;
                }
                return false;
            });

            if (editorOverlays.length > 0) {
                // Zamknij overlay edytora (najwyższy z-index)
                const editorOverlay = editorOverlays[editorOverlays.length - 1];
                console.log('IAI Templates: Zamykam overlay edytora');
                editorOverlay.remove();
            }

            // Odśwież listę w managerze (jeśli jest otwarta)
            refreshTemplateList();
            refreshTemplateSelector();

        } catch (error) {
            console.error('IAI Templates: Błąd podczas zapisywania szablonu:', error);
            showNotification('❌ Wystąpił błąd podczas zapisywania szablonu!', true);
        }
    }

    function closeModal() {
        const modal = document.getElementById('templateManagerModal');
        if (modal) {
            modal.remove();
        }

        // Usuń wszystkie modalne overlaye
        const overlays = document.querySelectorAll('.iai-modal-overlay');
        overlays.forEach(overlay => overlay.remove());
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNotification(message, isError = false) {
        // Usuń istniejące notyfikacje
        const existing = document.getElementById('iaiTemplateNotification');
        if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
        }

        const notification = document.createElement('div');
        notification.id = 'iaiTemplateNotification';
        notification.textContent = message;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: isError ? '#dc3545' : '#28a745',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: Z_INDEX_BASE + 100,
            fontSize: '14px',
            fontWeight: '500',
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out',
            maxWidth: '400px',
            wordWrap: 'break-word'
        });

        document.body.appendChild(notification);

        // Animacja pojawiania
        setTimeout(() => {
            if (notification && notification.style) {
                notification.style.opacity = '1';
            }
        }, 10);

        // Animacja znikania i usuwanie
        setTimeout(() => {
            if (notification && notification.style) {
                notification.style.opacity = '0';
                setTimeout(() => {
                    // Używaj parentNode.removeChild zamiast remove()
                    if (notification && notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, isError ? 5000 : 3000);
    }

    // ============================================================================
    // INICJALIZACJA
    // ============================================================================

    function fixCorruptedTemplates() {
        console.log('IAI Templates: Sprawdzanie i naprawa uszkodzonych danych...');

        try {
            let rawData = GM_getValue(TEMPLATES_KEY, '[]');
            console.log('IAI Templates: [FIX] Raw data type:', typeof rawData);

            // Parsuj tyle razy ile trzeba, aż dostaniemy tablicę
            let fixed = rawData;
            let parseCount = 0;

            while (typeof fixed === 'string' && parseCount < 5) {
                console.log(`IAI Templates: [FIX] Parsowanie poziom ${parseCount + 1}...`);
                try {
                    fixed = JSON.parse(fixed);
                    parseCount++;
                } catch (e) {
                    console.log('IAI Templates: [FIX] Nie można dalej parsować');
                    break;
                }
            }

            console.log(`IAI Templates: [FIX] Po ${parseCount} parsowaniach mamy typ:`, typeof fixed);
            console.log('IAI Templates: [FIX] Czy to tablica?', Array.isArray(fixed));

            // Jeśli to tablica, zapisz ją poprawnie
            if (Array.isArray(fixed)) {
                console.log('IAI Templates: [FIX] Zapisuję naprawione dane...');
                const correctJson = JSON.stringify(fixed);
                GM_setValue(TEMPLATES_KEY, correctJson);

                // Wyczyść cache
                cachedTemplates = null;

                console.log('IAI Templates: [FIX] ✅ Dane naprawione!');
                return true;
            } else {
                console.error('IAI Templates: [FIX] ❌ Nie udało się naprawić danych');
                return false;
            }

        } catch (error) {
            console.error('IAI Templates: [FIX] Błąd podczas naprawy:', error);
            return false;
        }
    }

    function initialize() {
        console.log('IAI Templates: Inicjalizacja systemu szablonów v1.3.1 (COMPLETE)...');

        try {
            // KROK 0: NAPRAW USZKODZONE DANE
            fixCorruptedTemplates();

            // KROK 1: Test funkcjonalności GM_setValue/GM_getValue
            const gmWorking = testGMStorage();
            if (!gmWorking) {
                console.error('IAI Templates: GM Storage nie działa! Szablony nie będą zapisywane trwale.');
                showNotification('⚠️ Uwaga: Problemy z zapisywaniem szablonów. Sprawdź konsolę.', true);
            }

            // KROK 2: Debug istniejących szablonów
            const existingTemplates = debugExistingTemplates();
            console.log('IAI Templates: Znaleziono', existingTemplates.length, 'istniejących szablonów');

            // KROK 3: Dodaj style
            addStyles();
            console.log('IAI Templates: Style dodane');

            // KROK 4: Dodaj selektor szablonów po krótkim opóźnieniu
            setTimeout(() => {
                console.log('IAI Templates: Próbuję dodać selektor szablonów...');
                createTemplateSelector();
            }, 1000);

            // KROK 5: Observer dla dynamicznych zmian
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Sprawdź czy dodano textarea
                                if (node.id === 'fg_insert' || node.querySelector('#fg_insert') ||
                                    (node.tagName && node.tagName.toLowerCase() === 'textarea')) {
                                    console.log('IAI Templates: Wykryto nowe textarea - dodaję selektor');
                                    setTimeout(() => createTemplateSelector(), 100);
                                }
                            }
                        });
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            console.log('IAI Templates: System szablonów zainicjalizowany pomyślnie!');

            // NOWE: Sprawdź aktualizacje changelog
            setTimeout(() => {
                checkForUpdates();
            }, 2500);

            // Pokazuj notification tylko gdy GM działa
            if (gmWorking) {
                setTimeout(() => {
                    showNotification(`📝 System szablonów IAI gotowy do pracy! (${new Date().toLocaleString('pl-PL')})`, false);
                }, 2000);
            }

        } catch (error) {
            console.error('IAI Templates: Błąd podczas inicjalizacji:', error);
            showNotification('❌ Błąd inicjalizacji systemu szablonów!', true);
        }
    }

    // Uruchom po załadowaniu DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 500);
    }

})();
