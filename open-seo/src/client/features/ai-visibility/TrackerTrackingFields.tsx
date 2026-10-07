import { EngineLabel } from "./EngineLabel";
import { Checkbox } from "@/client/components/ui/checkbox";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import type { ProjectMarket } from "@/client/features/projects/types";
import {
  aiEnginesWithoutLocation,
  type AiEngine,
  type AiTrackerState,
} from "@/shared/ai-visibility";
import {
  DEFAULT_LOCATION_CODE,
  LOCATION_OPTIONS,
} from "@/shared/keyword-locations";

export type TrackerDraft = {
  locationCode: number;
  languageCode: string;
  engines: AiEngine[];
  topic: { name: string; prompts: string[] };
};

export const MAX_PROMPTS_PER_ADDITION = 5;

/**
 * The first market every engine can collect in, else US English. Keeps the
 * country valid when the engine selection changes.
 */
export function collectableMarket(
  engines: AiEngine[],
  ...markets: ProjectMarket[]
): ProjectMarket {
  return (
    markets.find(
      (market) =>
        !aiEnginesWithoutLocation(engines, market.locationCode).length,
    ) ?? { locationCode: DEFAULT_LOCATION_CODE, languageCode: "en" }
  );
}

export function TrackerTrackingFields({
  state,
  defaultMarket,
  value,
  onChange,
  disabled,
}: {
  state: AiTrackerState;
  /** The project's market, or US English. */
  defaultMarket: ProjectMarket;
  value: TrackerDraft;
  onChange: (value: TrackerDraft) => void;
  // Base UI checkboxes aren't native inputs, so a disabled <fieldset> misses them.
  disabled: boolean;
}) {
  const countryOptions = LOCATION_OPTIONS.filter(
    (option) => !aiEnginesWithoutLocation(value.engines, option.code).length,
  );
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">AI engines</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {state.capabilities.map((capability) => (
          <label
            key={capability.engine}
            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 border-border"
          >
            <Checkbox
              checked={value.engines.includes(capability.engine)}
              disabled={disabled}
              onCheckedChange={(checked) => {
                const engines = checked
                  ? [...value.engines, capability.engine]
                  : value.engines.filter(
                      (engine) => engine !== capability.engine,
                    );
                onChange({
                  ...value,
                  engines,
                  ...collectableMarket(
                    engines,
                    {
                      locationCode: value.locationCode,
                      languageCode: value.languageCode,
                    },
                    defaultMarket,
                  ),
                });
              }}
            />
            <span className="text-sm font-medium">
              <EngineLabel
                engine={capability.engine}
                label={capability.label}
              />
            </span>
          </label>
        ))}
      </div>
      <ProjectMarketFields
        value={value}
        countryOptions={countryOptions}
        onChange={(market) => onChange({ ...value, ...market })}
      />
    </section>
  );
}
