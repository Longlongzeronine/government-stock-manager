export const FUND_CLUSTER_OPTIONS = ["06-SSP", "01-MOOE"] as const;

const CUSTOM_FUND_CLUSTER = "__custom_fund_cluster__";

type FundClusterControlProps = {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  className?: string;
};

export function FundClusterControl({
  value,
  onChange,
  editable = true,
  className = "flow-input",
}: FundClusterControlProps) {
  const isPreset = FUND_CLUSTER_OPTIONS.includes(
    value as (typeof FUND_CLUSTER_OPTIONS)[number],
  );

  if (!editable) return <span className="strong">{value || ""}</span>;

  return (
    <span className="inline-flex max-w-full items-center gap-1 align-middle">
      <select
        className={`${className} min-w-0 flex-1`}
        value={isPreset ? value : CUSTOM_FUND_CLUSTER}
        onChange={(event) =>
          onChange(
            event.target.value === CUSTOM_FUND_CLUSTER
              ? ""
              : event.target.value,
          )
        }
      >
        {FUND_CLUSTER_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_FUND_CLUSTER}>Custom</option>
      </select>
      {!isPreset && (
        <input
          className={`${className} min-w-0 flex-1`}
          value={value}
          placeholder="Enter fund cluster"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </span>
  );
}
