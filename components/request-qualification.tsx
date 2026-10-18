import {
  equipmentSupplies,
  type RequestQualification,
} from "../lib/qualification";
export function RequestQualificationSummary({
  value,
}: {
  value?: RequestQualification;
}) {
  if (!value?.equipment_supply)
    return (
      <p className="fine-print">
        This request predates the equipment questions. Confirm equipment and
        access with the client before quoting.
      </p>
    );
  return (
    <section className="qualification-summary">
      <h3>Equipment & Project Details</h3>
      <dl className="account-details">
        <div>
          <dt>Equipment Supply</dt>
          <dd>{equipmentSupplies[value.equipment_supply]}</dd>
        </div>
        <div>
          <dt>Equipment</dt>
          <dd>{value.equipment_details || "Needs review"}</dd>
        </div>
        <div>
          <dt>Installation Conditions</dt>
          <dd>{value.access_notes || "Not provided"}</dd>
        </div>
        <div>
          <dt>ZIP Code</dt>
          <dd>{value.postal_code}</dd>
        </div>
        <div>
          <dt>Budget</dt>
          <dd>{value.budget_range}</dd>
        </div>
        <div>
          <dt>Flexible Date</dt>
          <dd>{value.schedule_flexible ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Lead Source</dt>
          <dd>
            {value.lead_source}
            {value.referral_details ? ` · ${value.referral_details}` : ""}
          </dd>
        </div>
      </dl>
    </section>
  );
}
