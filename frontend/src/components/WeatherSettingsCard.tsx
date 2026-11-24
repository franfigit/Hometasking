import React, { useEffect, useState } from 'react';
import { MapPin, Search, Bell, Send, CheckCircle2, CloudSun } from 'lucide-react';
import { api, CitySearchResult, HouseSettings } from '../api/client';

interface WeatherSettingsCardProps {
  isAdmin: boolean;
}

export const WeatherSettingsCard: React.FC<WeatherSettingsCardProps> = ({ isAdmin }) => {
  const [settings, setSettings] = useState<HouseSettings | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setSettings(s))
      .catch((err) => console.error('Error cargando configuración:', err));
  }, []);

  const handleSearchCity = async () => {
    if (cityQuery.trim().length < 2) return;
    try {
      setSearching(true);
      const results = await api.searchCities(cityQuery);
      setCityResults(results);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCity = (city: CitySearchResult) => {
    if (!settings) return;
    setSettings({
      ...settings,
      locationName: city.label,
      latitude: city.latitude,
      longitude: city.longitude,
      timezone: city.timezone,
    });
    setCityResults([]);
    setCityQuery('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setFeedback(null);
      const updated = await api.updateSettings({
        ...settings,
        telegramBotToken: telegramTokenInput.trim() || undefined,
      });
      setSettings(updated);
      setTelegramTokenInput('');
      setFeedback('Configuración guardada correctamente.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await api.testNotification();
      const summary = res.results
        .map((r) => `${r.channel}: ${r.ok ? 'OK ✅' : `Error (${r.error}) ❌`}`)
        .join(' | ');
      alert(`Resultado de prueba:\n${summary}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTesting(false);
    }
  };

  if (!settings) return null;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <CloudSun className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Clima y Notificaciones del Hogar
            </h3>
            <p className="text-xs text-slate-500">
              Ubicación para pronóstico (Open-Meteo) y avisos cuando se dispare una tarea climática.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Ubicación */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" /> Ubicación del Hogar
            </span>
            {settings.locationName && (
              <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full">
                {settings.locationName}
              </span>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchCity();
                    }
                  }}
                  placeholder="Buscar ciudad (ej. Buenos Aires, Córdoba, Madrid...)"
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={handleSearchCity}
                  disabled={searching}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {cityResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-sm max-h-48 overflow-y-auto">
                  {cityResults.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleSelectCity(c)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-center justify-between"
                    >
                      <span className="font-medium text-slate-800">{c.label}</span>
                      <span className="text-slate-400">
                        {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canales externos */}
        {isAdmin && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-600" /> Notificaciones Externas (app cerrada)
            </div>

            {/* ntfy */}
            <div className="space-y-2 pb-3 border-b border-slate-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ntfyEnabled}
                  onChange={(e) => setSettings({ ...settings, ntfyEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                ntfy (Push gratis para celular Android / iOS)
              </label>
              {settings.ntfyEnabled && (
                <div className="grid sm:grid-cols-2 gap-2 pl-6">
                  <input
                    type="text"
                    value={settings.ntfyServerUrl}
                    onChange={(e) => setSettings({ ...settings, ntfyServerUrl: e.target.value })}
                    placeholder="https://ntfy.sh"
                    className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <input
                    type="text"
                    value={settings.ntfyTopic}
                    onChange={(e) => setSettings({ ...settings, ntfyTopic: e.target.value })}
                    placeholder="Topic único (ej. hometasking-mi-casa)"
                    className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              )}
            </div>

            {/* Telegram */}
            <div className="space-y-2 pb-3 border-b border-slate-200">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.telegramEnabled}
                  onChange={(e) => setSettings({ ...settings, telegramEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Telegram Bot
              </label>
              {settings.telegramEnabled && (
                <div className="grid sm:grid-cols-2 gap-2 pl-6">
                  <input
                    type="password"
                    value={telegramTokenInput}
                    onChange={(e) => setTelegramTokenInput(e.target.value)}
                    placeholder={
                      settings.hasTelegramToken
                        ? 'Token guardado (escribí para reemplazar)'
                        : 'Bot Token (de @BotFather)'
                    }
                    className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <input
                    type="text"
                    value={settings.telegramChatId}
                    onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                    placeholder="Chat ID (ej. 123456789)"
                    className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              )}
            </div>

            {/* Webhook */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.webhookEnabled}
                  onChange={(e) => setSettings({ ...settings, webhookEnabled: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Webhook genérico (JSON POST)
              </label>
              {settings.webhookEnabled && (
                <div className="pl-6">
                  <input
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {feedback && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {feedback}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {testing ? 'Enviando...' : 'Probar notificación'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
};
