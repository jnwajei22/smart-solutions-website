"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { services } from "../lib/catalog";
import {
  equipmentSupplies,
  leadSources,
  budgetRanges,
  type RequestQualification,
} from "../lib/qualification";
const qualification: RequestQualification = {
  equipment_supply: "unsure",
  equipment_details: "",
  postal_code: "",
  access_notes: "",
  budget_range: "Not Sure Yet",
  schedule_flexible: false,
  lead_source: "Other",
  referral_details: "",
};
const initial = {
  service: "wifi",
  property_type: "Residential",
  name: "",
  phone: "",
  address: "",
  city: "",
  preferred_date: "",
  details: "",
  qualification,
};
export function RequestForm() {
  const params = useSearchParams(),
    router = useRouter();
  const [form, setForm] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("dfw-request");
      // Browser storage is only available after hydration.
      if (saved) {
        const value = JSON.parse(saved);
        // Restoring a tab-local draft after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          ...initial,
          ...value,
          qualification: { ...qualification, ...value.qualification },
        });
      } else if (services.some((s) => s.id === params.get("service")))
        setForm((f) => ({ ...f, service: params.get("service")! }));
    } catch {}
  }, [params]);
  function change(key: string, value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      try {
        sessionStorage.setItem("dfw-request", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  function qualify(key: keyof RequestQualification, value: string | boolean) {
    setForm((f) => {
      const next = {
        ...f,
        qualification: { ...f.qualification, [key]: value },
      };
      try {
        sessionStorage.setItem("dfw-request", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.status === 401) {
        router.push("/login?next=/request");
        return;
      }
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      try {
        sessionStorage.removeItem("dfw-request");
      } catch {}
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to submit. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="form-card success-card">
        <CheckCircle2 size={48} />
        <div className="eyebrow">REQUEST RECEIVED</div>
        <h2>You’re on our radar.</h2>
        <p>
          Your request is saved. We’ll review the details and follow up in your
          client portal. Your preferred date is not a confirmed appointment;
          we’ll agree on scope, price, and scheduling before work begins.
        </p>
        <button className="button" onClick={() => router.push("/portal")}>
          View my request <ArrowRight size={18} />
        </button>
      </div>
    );
  return (
    <form onSubmit={submit} className="form-card">
      <div className="form-section-title">
        <span>01</span>
        <h2>Your project</h2>
      </div>
      <label>
        Service
        <select
          value={form.service}
          onChange={(e) => change("service", e.target.value)}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="segmented">
        <legend>Property Type</legend>
        {["Residential", "Commercial"].map((t) => (
          <label key={t} className={form.property_type === t ? "selected" : ""}>
            <input
              type="radio"
              name="property"
              checked={form.property_type === t}
              onChange={() => change("property_type", t)}
            />
            {t}
          </label>
        ))}
      </fieldset>
      <label>
        Project Details
        <textarea
          required
          minLength={15}
          maxLength={4000}
          rows={4}
          placeholder="What would you like to improve? Include equipment, rooms, approximate cable runs, or the issue you’re experiencing."
          value={form.details}
          onChange={(e) => change("details", e.target.value)}
        />
      </label>
      <fieldset className="equipment-questions">
        <legend>Equipment & Installation</legend>
        <label>
          Who Will Supply the Equipment?
          <select
            value={form.qualification.equipment_supply}
            onChange={(e) => qualify("equipment_supply", e.target.value)}
          >
            {Object.entries(equipmentSupplies).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="fine-print">
          Labor-only quotes are available for compatible equipment you already
          own. We’ll review the scope and any missing parts before booking.
        </p>
        <label>
          Equipment Details
          <textarea
            rows={3}
            maxLength={1200}
            required={["customer", "mixed"].includes(
              form.qualification.equipment_supply,
            )}
            minLength={
              ["customer", "mixed"].includes(
                form.qualification.equipment_supply,
              )
                ? 3
                : undefined
            }
            value={form.qualification.equipment_details}
            onChange={(e) => qualify("equipment_details", e.target.value)}
            placeholder="Brands, model numbers, quantities, and any mounts or accessories you already have. If unknown, tell us what you need help choosing."
          />
        </label>
        <label>
          Installation Conditions
          <textarea
            rows={3}
            maxLength={1200}
            value={form.qualification.access_notes}
            onChange={(e) => qualify("access_notes", e.target.value)}
            placeholder="TV size and wall type; cable start/end points; floors, attic access, rack size, or access restrictions. Please do not include passwords or access codes."
          />
        </label>
        <label>
          Estimated Budget
          <select
            value={form.qualification.budget_range}
            onChange={(e) => qualify("budget_range", e.target.value)}
          >
            {budgetRanges.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </fieldset>
      <div className="form-section-title">
        <span>02</span>
        <h2>Your details</h2>
      </div>
      <div className="field-grid">
        <label>
          Full Name
          <input
            required
            maxLength={100}
            autoComplete="name"
            autoCapitalize="words"
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <label>
          Phone Number
          <input
            required
            type="tel"
            maxLength={30}
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => change("phone", e.target.value)}
          />
        </label>
      </div>
      <label>
        Service Address
        <input
          required
          maxLength={250}
          autoComplete="street-address"
          autoCapitalize="words"
          value={form.address}
          onChange={(e) => change("address", e.target.value)}
        />
      </label>
      <div className="field-grid">
        <label>
          City
          <input
            required
            maxLength={80}
            autoComplete="address-level2"
            autoCapitalize="words"
            placeholder="e.g. Cedar Hill"
            value={form.city}
            onChange={(e) => change("city", e.target.value)}
          />
        </label>
        <label>
          ZIP Code
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            value={form.qualification.postal_code}
            onChange={(e) => qualify("postal_code", e.target.value)}
          />
        </label>
      </div>
      <div className="field-grid">
        <label>
          Preferred Date
          <input
            required
            type="date"
            min={new Date().toLocaleDateString("en-CA")}
            value={form.preferred_date}
            onChange={(e) => change("preferred_date", e.target.value)}
          />
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.qualification.schedule_flexible}
          onChange={(e) => qualify("schedule_flexible", e.target.checked)}
        />
        My Date Is Flexible for a Nearby Route Day
      </label>
      <div className="field-grid">
        <label>
          How Did You Find Us?
          <select
            value={form.qualification.lead_source}
            onChange={(e) => qualify("lead_source", e.target.value)}
          >
            {leadSources.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Referring Person or Business
          <input
            maxLength={200}
            value={form.qualification.referral_details}
            onChange={(e) => qualify("referral_details", e.target.value)}
          />
        </label>
      </div>
      <p className="fine-print">
        You’ll sign in or create an account to send your request. Your details
        stay in this tab while you do. Requested dates are subject to
        confirmation.
      </p>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <button disabled={busy} className="button full">
        {busy ? "Submitting…" : "Submit service request"}{" "}
        <ArrowRight size={18} />
      </button>
      <p className="fine-print">
        By submitting, you agree to our <a href="/terms">service terms</a> and{" "}
        <a href="/privacy">privacy notice</a>.
      </p>
    </form>
  );
}
