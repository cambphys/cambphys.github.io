// Upgrade-request form submission: uploads proof image to Supabase Storage,
// inserts a row into public.upgrade_requests.
(function () {
  const sb = window.cambphysSupabase;

  function getCourseIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("course");
    if (["ap", "fma", "usapho"].includes(c)) return c;
    return null;
  }

  function setMsg(el, text, kind) {
    el.className = "auth-msg " + (kind || "");
    el.textContent = text;
  }

  async function submitForm(form, msgEl, submitBtn) {
    const user = await window.cambphysAuth.currentUser();
    if (!user) { window.location.href = "/login/"; return; }

    const fd = new FormData(form);

    // Grade: radio or "other" text input
    let grade = fd.get("grade");
    if (grade === "other") grade = (fd.get("grade_other") || "").trim() || "Other";

    // Referrals: multi-select checkboxes + optional "other" text
    const referrals = fd.getAll("referral");
    const referralOther = (fd.get("referral_other") || "").trim();

    const file = form.querySelector("#proof").files[0];
    if (!file) { setMsg(msgEl, "Please upload a screenshot of your payment.", "error"); return; }

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";
    setMsg(msgEl, "");

    // 1. Upload screenshot to storage
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage
      .from("payment-proofs")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setMsg(msgEl, "Upload failed: " + upErr.message, "error");
      submitBtn.disabled = false; submitBtn.textContent = originalLabel;
      return;
    }

    // 2. Sign the URL so the email can embed the image. 90-day expiry.
    let proofSignedUrl = null;
    const { data: signed } = await sb.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 60 * 24 * 90);
    if (signed && signed.signedUrl) proofSignedUrl = signed.signedUrl;

    // 3. Insert request row
    const row = {
      user_id: user.id,
      course_id: fd.get("course_id"),
      parent_email: (fd.get("parent_email") || "").trim(),
      parent_name: (fd.get("parent_name") || "").trim(),
      student_email: (fd.get("student_email") || "").trim(),
      student_first_name: (fd.get("student_first_name") || "").trim(),
      student_last_name: (fd.get("student_last_name") || "").trim(),
      student_grade: grade,
      state: (fd.get("state") || "").trim().toUpperCase(),
      referral_sources: referrals,
      referral_other: referralOther || null,
      proof_image_path: path,
      proof_signed_url: proofSignedUrl,
    };
    const { error: insErr } = await sb.from("upgrade_requests").insert(row);
    if (insErr) {
      setMsg(msgEl, "Submission failed: " + insErr.message, "error");
      submitBtn.disabled = false; submitBtn.textContent = originalLabel;
      return;
    }

    form.style.display = "none";
    document.getElementById("thanks").style.display = "block";
  }

  window.cambphysUpgradeForm = { getCourseIdFromUrl, submitForm };
})();
