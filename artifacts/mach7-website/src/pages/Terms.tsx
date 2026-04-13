export default function Terms() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-4">Terms of Use</h1>
        <p className="text-muted-foreground font-mono text-sm">Last Updated: [ Date ]</p>
      </div>

      <div className="prose prose-invert prose-orange max-w-none">
        <p>
          {/* SWAP: Update with actual company details */}
          These Terms of Use govern your access to and use of the software and services provided by MACH 7 Technologies LLC ("we", "us", or "our").
        </p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>
          [ Placeholder: By using the app, you agree to these terms... ]
        </p>

        <h2>2. License and Restrictions</h2>
        <p>
          [ Placeholder: Detail the scope of the license granted and any usage restrictions. ]
        </p>

        <h2>3. User-Generated Content</h2>
        <p>
          [ Placeholder: Address ownership and rights concerning the data and media captured using the tool. ]
        </p>

        <h2>4. Limitation of Liability</h2>
        <p>
          [ Placeholder: Standard liability disclaimers. ]
        </p>

        <h2>5. Contact Us</h2>
        <p>
          If you have questions about these Terms, please contact us at:<br/>
          {/* SWAP: replace with your business email */}
          <a href="mailto:contact@mach7technologies.com" className="text-primary hover:underline">contact@mach7technologies.com</a>
        </p>
      </div>
    </div>
  );
}
