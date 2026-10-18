"use client";
import { useState } from "react";
import { inquiryEmail } from "../lib/launch";
export function InquiryForm() {
  const [prepared, setPrepared] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = [
      "DFW Smart Solutions project inquiry",
      ...[
        "Full Name",
        "Email",
        "Property Type",
        "City",
        "ZIP Code",
        "Preferred Weekend",
        "Project Details",
      ].map((k) => `${k}: ${data.get(k) || "Not specified"}`),
    ].join("\n\n");
    window.location.href = `mailto:${inquiryEmail}?subject=${encodeURIComponent("Weekend IT Project Inquiry")}&body=${encodeURIComponent(body)}`;
    setPrepared(true);
  }
  return (
    <form onSubmit={submit} className="form-card">
      <h2>Tell Justin About Your Project</h2>
      <p>
        This form opens a prepared email. Review it and press Send in your email
        app. Nothing is sent or booked by this website.
      </p>
      <div className="field-grid">
        <label>
          Full Name
          <input
            name="Full Name"
            required
            autoComplete="name"
            maxLength={100}
          />
        </label>
        <label>
          Email
          <input
            name="Email"
            required
            type="email"
            autoComplete="email"
            maxLength={254}
          />
        </label>
      </div>
      <label>
        Property Type
        <select name="Property Type">
          <option>Residential</option>
          <option>Commercial</option>
          <option>Government / Organization</option>
        </select>
      </label>
      <div className="field-grid">
        <label>
          City
          <input
            name="City"
            required
            autoComplete="address-level2"
            maxLength={80}
          />
        </label>
        <label>
          ZIP Code
          <input
            name="ZIP Code"
            required
            pattern="[0-9]{5}"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
        </label>
      </div>
      <label>
        Preferred Weekend
        <input
          name="Preferred Weekend"
          maxLength={100}
          placeholder="e.g. A Saturday in November; flexible"
        />
      </label>
      <label>
        Project Details
        <textarea
          name="Project Details"
          required
          minLength={15}
          maxLength={1200}
          rows={5}
          placeholder="What do you need help with? Include device models and whether equipment is already onsite. Do not include passwords or access codes."
        />
      </label>
      <p className="fine-print">
        Initial focus: small solo IT tasks. Cedar Hill and southern Dallas
        County; other locations reviewed individually. Launch setup is in
        progress; no appointments or payments are accepted here.
      </p>
      <button className="button full">Prepare Inquiry Email →</button>
      {prepared && (
        <p className="alert" role="status">
          Your email app was requested. Your inquiry has not been sent by this
          website. Review the message and press Send. If no app opened, email
          Justin directly using the address below.
        </p>
      )}
      <p>
        Email directly: <a href={`mailto:${inquiryEmail}`}>{inquiryEmail}</a>.
        Include your city/ZIP and project details.
      </p>
      <p className="fine-print">
        Read our <a href="/privacy">Privacy Notice</a> and{" "}
        <a href="/terms">Inquiry Information</a>.
      </p>
    </form>
  );
}
