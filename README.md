# CONTXT website

`contxt.html` is the standalone homepage. GitHub Pages serves its identical copy, `index.html`. `CNAME` sets the custom domain to `contxt.im`; `.nojekyll` publishes the static files directly.

The original export is preserved locally in `input/CONTXT.original.html` and excluded from version control. Edit `src/contxt.template.html`, then rebuild and verify:

```sh
python3 scripts/build-site.py
node scripts/test-contact.mjs
```

## Publish to GitHub Pages

With GitHub CLI installed and signed in to an account with administration access to `kimpeter/contxt`:

```sh
bash scripts/deploy-github-pages.sh
```

The script clones the remote into a temporary checkout, updates only the four public site files, commits, pushes without forcing, and configures Pages on the repository's default branch at `/`. It preserves repository visibility and unrelated files. A private repository must have a GitHub plan that supports Pages. The editable source and tests remain in this local workspace.

Set the Pages custom domain before changing DNS. In Spaceship DNS, replace the current apex A record (`54.180.207.172`) with these four records, then replace the current `www` A record with the CNAME below:

| Host | Type | Value |
| --- | --- | --- |
| @ | A | 185.199.108.153 |
| @ | A | 185.199.109.153 |
| @ | A | 185.199.110.153 |
| @ | A | 185.199.111.153 |
| www | CNAME | kimpeter.github.io |

Keep the existing Spacemail MX, SPF and DKIM records. Once GitHub validates DNS and issues the certificate, enable **Enforce HTTPS** in Settings → Pages. Verify `https://contxt.im/` and `https://www.contxt.im/` display this website.

Source: [GitHub custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Contact email

The contact form sends JSON to `https://formsubmit.co/ajax/peter@contxt.im`. It includes the inquiry type, name, reply email, optional organization and message. The visitor's email is used for Reply-To. Requests have a 15-second timeout and a duplicate submission guard. Failed requests preserve the fields and offer an email fallback; only an explicit successful API response displays confirmation.

FormSubmit must be activated by the mailbox owner. An initialization request on 2026-10-14 returned `success: "false"` with confirmation that an activation email was sent. Open that email at `peter@contxt.im` and click **Activate Form**. Then submit one labeled test inquiry from the deployed site and confirm its arrival. Until activation, the form shows an error and offers direct email.

Sources: [FormSubmit](https://formsubmit.co/), [AJAX documentation](https://formsubmit.co/ajax-documentation).
