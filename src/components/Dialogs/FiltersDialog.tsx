import { useState } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { FILTER_REGISTRY, getFilterMeta, createFilter } from '../../engine/filters';
import type { VideoFilter, VideoFilterType } from '../../types';
import { Button } from '../UI/Button';
import { Slider } from '../UI/Slider';
import { NumberInput } from '../UI/Select';
import { Icon } from '../UI/Icons';
import './filters.css';

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  };
}

export function FiltersDialog({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const source = useSceneStore((s) => s.sources[sourceId]);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(
    source?.filters[0]?.id ?? null
  );
  const [addType, setAddType] = useState<VideoFilterType>('chroma-key');
  const sceneView = useSceneStore.getState();

  if (!source) {
    return null;
  }

  const filters = source.filters;
  const selectedFilter: VideoFilter | undefined = filters.find((f) => f.id === selectedFilterId) ?? filters[0];
  const meta = selectedFilter ? getFilterMeta(selectedFilter.type) : undefined;

  const updateParam = (key: string, value: number) => {
    if (!selectedFilter) return;
    sceneView.updateFilterParams(sourceId, selectedFilter.id, { [key]: value });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card modal-card--filters" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-titlebar">
          <span className="modal-title">
            <Icon name="filter" size={14} /> Filters — {source.name}
          </span>
          <button className="modal-close" onClick={onClose} title="Close">
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="filters-body">
          <div className="filters-list">
            {filters.length === 0 && <div className="filters-empty">No filters</div>}
            {filters.map((f) => (
              <label
                key={f.id}
                className={`filters-item ${
                  selectedFilter?.id === f.id ? 'filters-item--active' : ''
                }`}
                onClick={() => setSelectedFilterId(f.id)}
              >
                <input
                  type="checkbox"
                  checked={f.enabled}
                  onChange={(e) => {
                    e.stopPropagation();
                    sceneView.toggleFilter(sourceId, f.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="filters-item-name">{f.name}</span>
              </label>
            ))}
            <div className="filters-add">
              <select
                className="obs-select filters-add-select"
                value={addType}
                onChange={(e) => setAddType(e.target.value as VideoFilterType)}
              >
                {FILTER_REGISTRY.map((m) => (
                  <option key={m.type} value={m.type}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Button
                variant="default"
                onClick={() => {
                  const filter = createFilter(addType);
                  sceneView.addFilter(sourceId, {
                    type: filter.type,
                    name: filter.name,
                    enabled: filter.enabled,
                    params: filter.params,
                  });
                  setSelectedFilterId(filter.id);
                }}
              >
                <Icon name="plus" size={12} />
                Add
              </Button>
            </div>
          </div>

          <div className="filters-props">
            {!selectedFilter || !meta ? (
              <div className="filters-empty">Select a filter to edit its properties.</div>
            ) : (
              <>
                <div className="filters-props-head">
                  <span>{selectedFilter.name}</span>
                  <button
                    className="filters-remove"
                    title="Remove filter"
                    onClick={() => {
                      sceneView.removeFilter(sourceId, selectedFilter.id);
                      setSelectedFilterId(null);
                    }}
                  >
                    <Icon name="minus" size={13} />
                  </button>
                </div>

                {meta.params
                  .filter((p) => !p.color)
                  .map((p) => {
                    const value = selectedFilter.params[p.key] ?? defaultFor(selectedFilter, p.key);
                    return (
                      <div className="filter-field" key={p.key}>
                        <div className="filter-field-head">
                          <span className="filter-field-label">{p.label}</span>
                          <NumberInput
                            className="filter-field-number"
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            value={Number(value.toFixed(2))}
                            onChange={(e) => updateParam(p.key, Number(e.target.value))}
                          />
                        </div>
                        <Slider
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={value}
                          onValueChange={(v) => updateParam(p.key, v)}
                        />
                      </div>
                    );
                  })}

                {selectedFilter.type === 'chroma-key' && (
                  <div className="filter-field">
                    <span className="filter-field-label">Key Color</span>
                    <input
                      type="color"
                      className="filter-color"
                      value={rgbToHex(
                        selectedFilter.params.keyR ?? 0,
                        selectedFilter.params.keyG ?? 1,
                        selectedFilter.params.keyB ?? 0
                      )}
                      onChange={(e) => {
                        const { r, g, b } = hexToRgb(e.target.value);
                        sceneView.updateFilterParams(sourceId, selectedFilter.id, {
                          keyR: r,
                          keyG: g,
                          keyB: b,
                        });
                      }}
                    />
                  </div>
                )}

                <p className="filters-note">
                  Changes apply live to the composite output.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

const DEFAULTS: Record<string, Record<string, number>> = {
  'chroma-key': { keyR: 0, keyG: 1, keyB: 0, similarity: 0.4, smoothness: 0.08, spill: 0.1 },
  'color-correction': { brightness: 0, contrast: 1, saturation: 1, gamma: 1, degrees: 0 },
};

function defaultFor(filter: VideoFilter, key: string): number {
  return DEFAULTS[filter.type]?.[key] ?? 0;
}