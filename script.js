/*
 * script.js
 *
 * This file adds interactivity to the Premium Crete Experience site. It handles
 * tab navigation, VIP gating, cookie consent, legal modals, chat launch,
 * settings management and a simple booking form. All configurable values are
 * stored in localStorage so the owner can adjust behaviour without editing
 * the code.
 */

(function () {
  // Default settings – these can be overridden via the settings panel and persist via localStorage
  const DEFAULTS = {
    phoneNumber: '+302101234567',
    vipCode: 'VIP2025',
    vipGreeting: 'Καλώς ήρθες VIP επισκέπτη!',
    useWhatsApp: false,
    // Default available payment methods. The admin can enable/disable or rename them via settings.
    paymentMethods: [
      'Πληρωμή στην παραλαβή',
      'Κάρτα (Stripe)',
      'PayPal',
      'Κατάθεση σε Τράπεζα',
      'Apple Pay',
      'Google Pay',
      'Revolut',
      'Viva Wallet',
      'Crypto'
    ],
    // Car categories with prices per day (EUR)
    carCategories: {
      'Economy': 30,
      'SUV': 50,
      'Luxury': 90
    },
    // Extra options with prices per day (EUR)
    extras: {
      'GPS': 5,
      'Παιδικό Κάθισμα': 6,
      'Πρόσθετος Οδηγός': 7,
      'Πλήρης Ασφάλεια': 10
    },
    // Deposit percentage applied to total price (0–100)
    depositPercent: 30,
    adminEmail: 'info@miracars.example.com'
  };

  // Load settings from localStorage or fall back to defaults
  function loadSetting(key) {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return stored;
      }
    }
    return DEFAULTS[key];
  }

  function saveSetting(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Current settings cached in memory
  let phoneNumber = loadSetting('phoneNumber');
  let vipCode = loadSetting('vipCode');
  let vipGreeting = loadSetting('vipGreeting');
  let useWhatsApp = loadSetting('useWhatsApp');
  let paymentMethods = loadSetting('paymentMethods');
  let carCategories = loadSetting('carCategories');
  let extras = loadSetting('extras');
  let depositPercent = loadSetting('depositPercent');
  let adminEmail = loadSetting('adminEmail');

  // Instructions shown in the price summary for each payment method. The admin can override by renaming methods; if no match is found a generic message is shown.
  const PAYMENT_INSTRUCTIONS = {
    'Πληρωμή στην παραλαβή': 'Καμία προπληρωμή – πληρώνετε το πλήρες ποσό κατά την παραλαβή του οχήματος.',
    'Κάρτα (Stripe)': 'Θα λάβετε σύνδεσμο πληρωμής μέσω email για να ολοκληρώσετε την προκαταβολή με κάρτα μέσω Stripe.',
    'PayPal': 'Θα σας σταλεί σύνδεσμος PayPal για την πληρωμή της προκαταβολής.',
    'Κατάθεση σε Τράπεζα': 'Θα σας δοθούν τα στοιχεία IBAN για την τραπεζική κατάθεση.',
    'Apple Pay': 'Θα σας σταλεί αίτημα Apple Pay για την πληρωμή της προκαταβολής.',
    'Google Pay': 'Θα λάβετε σύνδεσμο Google Pay για την πληρωμή.',
    'Revolut': 'Θα σας σταλεί σύνδεσμος πληρωμής Revolut.',
    'Viva Wallet': 'Θα σας δοθεί σύνδεσμος Viva Wallet για την προκαταβολή.',
    'Crypto': 'Θα σας δοθεί διεύθυνση πορτοφολιού (BTC/ETH) για πληρωμή σε κρυπτονομίσματα.'
  };

  // Admin authentication state. If no password is set, the admin will be prompted to create one on first login. When logged in, isAdmin flag is true.
  function getAdminPassword() {
    return localStorage.getItem('adminPassword') || null;
  }
  function setAdminPassword(pwd) {
    localStorage.setItem('adminPassword', pwd);
  }
  function isAdminLoggedIn() {
    return localStorage.getItem('isAdmin') === 'true';
  }
  function setAdminLoggedIn(flag) {
    if (flag) {
      localStorage.setItem('isAdmin', 'true');
    } else {
      localStorage.removeItem('isAdmin');
    }
  }

  /**
   * Update navigation items based on admin authentication state.
   * When admin is logged in, the settings link becomes visible and the auth link shows "Αποσύνδεση".
   */
  function updateAuthNav() {
    const loggedIn = isAdminLoggedIn();
    // Desktop
    const authLink = document.getElementById('admin-auth-link');
    const settingsLink = document.getElementById('settings-link');
    if (authLink) {
      authLink.textContent = loggedIn ? 'Αποσύνδεση' : 'Είσοδος';
    }
    if (settingsLink) {
      settingsLink.classList.toggle('hidden', !loggedIn);
    }
    // Mobile
    const authLinkMobile = document.getElementById('mobile-admin-auth-link');
    const settingsLinkMobile = document.getElementById('mobile-settings-link');
    if (authLinkMobile) {
      authLinkMobile.textContent = loggedIn ? 'Αποσύνδεση' : 'Είσοδος';
    }
    if (settingsLinkMobile) {
      settingsLinkMobile.classList.toggle('hidden', !loggedIn);
    }
  }

  /**
   * Render login modal content depending on whether a password is already set.
   */
  function renderLoginContent() {
    const container = document.getElementById('login-content');
    if (!container) return;
    container.innerHTML = '';
    const password = getAdminPassword();
    if (!password) {
      // Setup form for first time password creation
      const form = document.createElement('form');
      form.className = 'space-y-4';
      form.innerHTML = `
        <p class="text-sm">Ορίστε κωδικό πρόσβασης για τον λογαριασμό διαχειριστή.</p>
        <div>
          <label for="new-password" class="block text-sm font-medium mb-1">Νέος κωδικός</label>
          <input type="password" id="new-password" class="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-700" required />
        </div>
        <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white w-full py-2 rounded font-semibold">Αποθήκευση</button>
      `;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const newPwd = form.querySelector('#new-password').value.trim();
        if (newPwd.length < 4) {
          alert('Ο κωδικός πρέπει να έχει τουλάχιστον 4 χαρακτήρες.');
          return;
        }
        setAdminPassword(newPwd);
        setAdminLoggedIn(true);
        updateAuthNav();
        closeLogin();
        alert('Ο κωδικός αποθηκεύτηκε. Έχετε συνδεθεί ως διαχειριστής.');
      });
      container.appendChild(form);
    } else {
      // Login form
      const form = document.createElement('form');
      form.className = 'space-y-4';
      form.innerHTML = `
        <div>
          <label for="admin-password" class="block text-sm font-medium mb-1">Κωδικός</label>
          <input type="password" id="admin-password" class="w-full rounded border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-700" required />
        </div>
        <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white w-full py-2 rounded font-semibold">Είσοδος</button>
        <button type="button" id="bio-login" class="bg-green-600 hover:bg-green-500 text-white w-full py-2 rounded font-semibold">Σύνδεση με Βιομετρικά</button>
      `;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const entered = form.querySelector('#admin-password').value;
        const stored = getAdminPassword();
        if (entered === stored) {
          setAdminLoggedIn(true);
          updateAuthNav();
          closeLogin();
          alert('Επιτυχής σύνδεση.');
        } else {
          alert('Λάθος κωδικός.');
        }
      });
      // Biometric login button
      form.querySelector('#bio-login').addEventListener('click', function () {
        // Simulate a biometric authentication using WebAuthn API if available
        // Here we simply set admin as logged in. In a real implementation, integrate WebAuthn.
        // Provide user feedback
        alert('Προσομοίωση βιομετρικής σύνδεσης: Έγκριση...');
        setAdminLoggedIn(true);
        updateAuthNav();
        closeLogin();
      });
      container.appendChild(form);
    }
  }

  /**
   * Open login modal
   */
  window.openLogin = function () {
    renderLoginContent();
    document.getElementById('login-modal').classList.remove('hidden');
  };
  window.closeLogin = function () {
    document.getElementById('login-modal').classList.add('hidden');
  };

  /**
   * Toggle authentication action: log in if not logged, log out if logged
   */
  window.toggleAuth = function () {
    if (isAdminLoggedIn()) {
      // Sign out
      setAdminLoggedIn(false);
      updateAuthNav();
      alert('Αποσυνδεθήκατε.');
      // Close settings panel if open
      closeSettings();
    } else {
      openLogin();
    }
  };

  /**
   * Initialise the page after DOM loads
   */
  function init() {
    // Cookie consent
    if (!localStorage.getItem('cookiesAccepted')) {
      document.getElementById('cookie-banner').classList.remove('hidden');
    }

    // Set up nav state
    const defaultTab = 'home';
    showTab(defaultTab);

    // Update VIP nav links if VIP already unlocked
    updateVIPNav();

    // Populate dynamic selects and extras for bookings
    populateBookingSelects();
    populateExtras();
    // Populate hero select with car categories
    const heroSelect = document.getElementById('hero-car-category');
    if (heroSelect) {
      heroSelect.innerHTML = '';
      Object.keys(carCategories).forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        heroSelect.appendChild(opt);
      });
    }
    // Handle hero search submission
    const heroForm = document.getElementById('hero-search');
    if (heroForm) {
      heroForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const cat = document.getElementById('hero-car-category').value;
        const pick = document.getElementById('hero-pickup-date').value;
        const drop = document.getElementById('hero-dropoff-date').value;
        // Set values in booking form if exist
        const bookingCategory = document.getElementById('car-category');
        const bookingPickup = document.getElementById('pickup-date');
        const bookingDropoff = document.getElementById('dropoff-date');
        if (bookingCategory && cat) bookingCategory.value = cat;
        if (bookingPickup && pick) bookingPickup.value = pick;
        if (bookingDropoff && drop) bookingDropoff.value = drop;
        // Navigate to booking tab and recalc price
        showTab('booking');
        calculatePrice();
      });
    }
    // Initial price summary
    calculatePrice();

    // Handle booking form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Add listeners to recalculate price when inputs change
    const pickupInput = document.getElementById('pickup-date');
    const dropoffInput = document.getElementById('dropoff-date');
    const carSelect = document.getElementById('car-category');
    const paymentSelect = document.getElementById('payment-method');
    if (pickupInput) pickupInput.addEventListener('change', calculatePrice);
    if (dropoffInput) dropoffInput.addEventListener('change', calculatePrice);
    if (carSelect) carSelect.addEventListener('change', calculatePrice);
    // Payment method doesn't change price but we still want to update summary instructions
    if (paymentSelect) paymentSelect.addEventListener('change', calculatePrice);

    // Pre-fill settings panel inputs
    document.getElementById('phone-input').value = phoneNumber;
    document.getElementById('vip-input').value = vipCode;
    document.getElementById('greeting-input').value = vipGreeting;

    // Update auth navigation based on current admin login state
    updateAuthNav();
  }

  /**
   * Show the specified tab and update nav styling
   */
  window.showTab = function (tabId) {
    document.querySelectorAll('.tab-section').forEach((section) => {
      section.classList.add('hidden');
    });
    const activeSection = document.getElementById(tabId);
    if (activeSection) activeSection.classList.remove('hidden');

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.remove('active-tab');
    });
    // Add active class to current nav link (both desktop and mobile)
    document.querySelectorAll(`[data-target="${tabId}"]`).forEach((link) => {
      link.classList.add('active-tab');
    });
  };

  /**
   * Handle VIP link click – prompt for VIP code if not already unlocked
   */
  window.handleVIP = function (target) {
    const isVip = localStorage.getItem('isVIP') === 'true';
    if (isVip) {
      showTab(target);
      return;
    }
    const input = prompt('Εισάγετε τον VIP κωδικό για πρόσβαση:');
    if (input && input.trim() === vipCode) {
      localStorage.setItem('isVIP', 'true');
      updateVIPNav();
      alert(vipGreeting);
      showTab(target);
    } else if (input) {
      alert('Λάθος κωδικός VIP.');
    }
  };

  /**
   * Update VIP link classes depending on unlocked state
   */
  function updateVIPNav() {
    const isVip = localStorage.getItem('isVIP') === 'true';
    document.querySelectorAll('.vip-link').forEach((link) => {
      if (isVip) {
        link.classList.remove('text-gray-400');
        link.classList.add('text-gray-800', 'dark:text-gray-200');
      } else {
        link.classList.remove('text-gray-800', 'dark:text-gray-200');
        link.classList.add('text-gray-400');
      }
    });
  }

  /**
   * Populate booking form selects based on admin settings
   */
  function populateBookingSelects() {
    const carSel = document.getElementById('car-category');
    const paySel = document.getElementById('payment-method');
    if (carSel) {
      carSel.innerHTML = '';
      Object.keys(carCategories).forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        // Show price per day next to category for clarity
        opt.textContent = `${cat} (\u20AC${carCategories[cat]} / ημέρα)`;
        carSel.appendChild(opt);
      });
    }
    if (paySel) {
      paySel.innerHTML = '';
      paymentMethods.forEach((method) => {
        const opt = document.createElement('option');
        opt.value = method;
        opt.textContent = method;
        paySel.appendChild(opt);
      });
    }
  }

  /**
   * Populate extras checkboxes based on admin settings
   */
  function populateExtras() {
    const container = document.getElementById('extras-container');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(extras).forEach((extraKey) => {
      const id = `extra-${extraKey.replace(/\s+/g, '-')}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center space-x-2';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = id;
      checkbox.value = extraKey;
      checkbox.className = 'form-checkbox h-4 w-4 text-blue-600';
      // When extras change, recalculate price
      checkbox.addEventListener('change', calculatePrice);
      const label = document.createElement('label');
      label.htmlFor = id;
      label.className = 'text-sm select-none';
      label.textContent = `${extraKey} (\u20AC${extras[extraKey]} / ημέρα)`;
      wrapper.appendChild(checkbox);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    });
  }

  /**
   * Calculate and display the price summary based on selected options
   */
  function calculatePrice() {
    const pickupEl = document.getElementById('pickup-date');
    const dropoffEl = document.getElementById('dropoff-date');
    const categoryEl = document.getElementById('car-category');
    const paymentEl = document.getElementById('payment-method');
    const priceEl = document.getElementById('price-summary');
    if (!priceEl) return;
    const pickup = pickupEl && pickupEl.value ? new Date(pickupEl.value) : null;
    const dropoff = dropoffEl && dropoffEl.value ? new Date(dropoffEl.value) : null;
    const category = categoryEl && categoryEl.value;
    const payment = paymentEl && paymentEl.value;
    // Validate required fields
    if (!pickup || !dropoff || !category) {
      priceEl.textContent = 'Επιλέξτε ημερομηνίες και κατηγορία οχήματος για να υπολογίσετε την τιμή.';
      return;
    }
    // Calculate number of days (minimum 1 day)
    let days = Math.ceil((dropoff - pickup) / (1000 * 60 * 60 * 24));
    if (!isFinite(days) || days < 1) days = 1;
    // Base price
    const basePricePerDay = carCategories[category] || 0;
    const baseTotal = basePricePerDay * days;
    // Extras
    let extrasTotal = 0;
    const selectedExtras = [];
    document.querySelectorAll('#extras-container input[type="checkbox"]:checked').forEach((chk) => {
      const key = chk.value;
      selectedExtras.push(key);
      const price = extras[key] || 0;
      extrasTotal += price * days;
    });
    // Calculate total and deposit
    const subTotal = baseTotal + extrasTotal;
    const depositAmount = depositPercent > 0 ? Math.round((subTotal * depositPercent) / 100 * 100) / 100 : 0;
    const total = Math.round(subTotal * 100) / 100;
    // Build summary lines
    let summary = '';
    summary += `Διάρκεια: ${days} ημέρα${days > 1 ? 'ς' : ''}<br/>`;
    summary += `Κατηγορία: ${category} – \u20AC${basePricePerDay}/ημ. → \u20AC${baseTotal.toFixed(2)}<br/>`;
    if (selectedExtras.length) {
      summary += `Extras: ${selectedExtras.join(', ')} → \u20AC${extrasTotal.toFixed(2)}<br/>`;
    }
    summary += `<strong>Σύνολο: \u20AC${total.toFixed(2)}</strong><br/>`;
    if (depositPercent > 0) {
      summary += `Προκαταβολή (${depositPercent}%): \u20AC${depositAmount.toFixed(2)}<br/>`;
    }
    if (payment) {
      summary += `Τρόπος πληρωμής: ${payment}<br/>`;
      // Provide simple instruction for payment method
      const instructions = PAYMENT_INSTRUCTIONS[payment] || 'Θα επικοινωνήσουμε μαζί σας για λεπτομέρειες πληρωμής.';
      summary += `<em>${instructions}</em>`;
    }
    priceEl.innerHTML = summary;
  }

  /**
   * Handle submission of booking form
   */
  function handleBookingSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const phone = form.querySelector('#phone').value.trim();
    const pickup = form.querySelector('#pickup-date').value;
    const dropoff = form.querySelector('#dropoff-date').value;
    const category = form.querySelector('#car-category').value;
    const payment = form.querySelector('#payment-method').value;
    const notes = form.querySelector('#notes').value.trim();
    // Selected extras
    const selectedExtras = Array.from(document.querySelectorAll('#extras-container input[type="checkbox"]:checked')).map((chk) => chk.value);
    // Calculate price components
    const startDate = pickup ? new Date(pickup) : null;
    const endDate = dropoff ? new Date(dropoff) : null;
    let days = 1;
    if (startDate && endDate) {
      days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (!isFinite(days) || days < 1) days = 1;
    }
    const basePerDay = carCategories[category] || 0;
    const baseTotal = basePerDay * days;
    let extrasTotal = 0;
    selectedExtras.forEach((ex) => {
      extrasTotal += (extras[ex] || 0) * days;
    });
    const subtotal = baseTotal + extrasTotal;
    const depositAmount = depositPercent > 0 ? Math.round((subtotal * depositPercent) / 100 * 100) / 100 : 0;
    const total = Math.round(subtotal * 100) / 100;

    // Compose email body
    let bodyLines = [];
    bodyLines.push('Νέα Κράτηση');
    bodyLines.push('');
    bodyLines.push(`Όνομα: ${name}`);
    bodyLines.push(`Email: ${email}`);
    bodyLines.push(`Τηλέφωνο: ${phone}`);
    bodyLines.push('');
    bodyLines.push(`Κατηγορία οχήματος: ${category}`);
    bodyLines.push(`Extras: ${selectedExtras.length ? selectedExtras.join(', ') : 'Κανένα'}`);
    bodyLines.push(`Ημ/νία παραλαβής: ${pickup}`);
    bodyLines.push(`Ημ/νία επιστροφής: ${dropoff}`);
    bodyLines.push(`Ημέρες: ${days}`);
    bodyLines.push('');
    bodyLines.push(`Βάση: €${basePerDay}/ημ × ${days} = €${baseTotal.toFixed(2)}`);
    if (extrasTotal > 0) {
      bodyLines.push(`Extras: €${extrasTotal.toFixed(2)}`);
    }
    bodyLines.push(`Σύνολο: €${total.toFixed(2)}`);
    if (depositPercent > 0) {
      bodyLines.push(`Προκαταβολή (${depositPercent}%): €${depositAmount.toFixed(2)}`);
    }
    bodyLines.push(`Τρόπος πληρωμής: ${payment}`);
    bodyLines.push('');
    if (notes) {
      bodyLines.push(`Σημειώσεις: ${notes}`);
    }
    const body = encodeURIComponent(bodyLines.join('\n'));
    const subject = encodeURIComponent('Νέα κράτηση Mira Cars');
    const mailto = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
    // Redirect to email client
    window.location.href = mailto;
    alert('Η κράτηση έχει αποσταλεί! Θα επικοινωνήσουμε σύντομα.');
    // Reset form after sending and reset extras and summary
    form.reset();
    // Reset extras
    document.querySelectorAll('#extras-container input[type="checkbox"]').forEach((chk) => (chk.checked = false));
    calculatePrice();
  }

  /**
   * Accept cookies and hide banner
   */
  window.acceptCookies = function () {
    localStorage.setItem('cookiesAccepted', 'true');
    document.getElementById('cookie-banner').classList.add('hidden');
  };

  /**
   * Open chat: either WhatsApp or phone call based on setting
   */
  window.openChat = function () {
    const digits = phoneNumber.replace(/\D/g, '');
    if (useWhatsApp) {
      window.open(`https://wa.me/${digits}?text=%CE%93%CE%B5%CE%B9%CE%B1%20σας%2C%20ενδιαφέρομαι%20για%20τις%20υπηρεσίες%20σας.`);
    } else {
      window.location.href = `tel:${digits}`;
    }
  };

  /**
   * Legal modal content definitions
   */
  const LEGAL_TEXTS = {
    terms: {
      title: 'Όροι Χρήσης',
      body: `
        <p>Το παρόν website παρέχεται «ως έχει» για πληροφοριακούς σκοπούς. Η χρήση του
        συνεπάγεται αποδοχή των όρων αυτών. Δεν φέρουμε ευθύνη για τυχόν
        ανακρίβειες ή παραλείψεις. Συνιστάται να συμβουλευθείτε νομικό σύμβουλο
        για επίσημη νομική καθοδήγηση.</p>
        <p>Απαγορεύεται η αντιγραφή ή αναπαραγωγή του περιεχομένου χωρίς προηγούμενη
        έγγραφη άδεια. Ο διαχειριστής διατηρεί το δικαίωμα αλλαγής των όρων
        χρήσης χωρίς προειδοποίηση.</p>
      `
    },
    privacy: {
      title: 'Πολιτική Απορρήτου',
      body: `
        <p>Συλλέγουμε μόνο τα απολύτως απαραίτητα προσωπικά δεδομένα για την
        επικοινωνία και την παροχή υπηρεσιών. Τα δεδομένα διατηρούνται με ασφάλεια
        και δεν κοινοποιούνται σε τρίτους χωρίς συγκατάθεση, σύμφωνα με τον
        Κανονισμό GDPR και την ελληνική νομοθεσία.</p>
        <p>Έχετε το δικαίωμα πρόσβασης, διόρθωσης ή διαγραφής των δεδομένων σας.
        Επικοινωνήστε μαζί μας για οποιοδήποτε αίτημα σχετικό με τα προσωπικά σας
        δεδομένα.</p>
      `
    },
    cookies: {
      title: 'Πολιτική Cookies',
      body: `
        <p>Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία σας και να
        αναλύσουμε την επισκεψιμότητα. Μπορείτε να διαγράψετε ή να μπλοκάρετε
        cookies μέσω των ρυθμίσεων του browser σας. Συνεχίζοντας την πλοήγηση
        αποδέχεστε τη χρήση cookies.</p>
      `
    },
    imprint: {
      title: 'Imprint',
      // The body will be generated dynamically when the modal opens to include current phone and email
      body: ''
    },
    legal: {
      title: 'Νομικές Πληροφορίες',
      body: `<p>Για να διαβάσετε τους αναλυτικούς όρους, παρακαλούμε επιλέξτε μία από τις παραπάνω ενότητες: Όροι Χρήσης, Πολιτική Απορρήτου, Cookies ή Imprint.</p>`
    }
  };

  /**
   * Show a legal modal by key
   */
  window.openModal = function (key) {
    const entry = LEGAL_TEXTS[key];
    if (!entry) return;
    let body = entry.body;
    // Inject dynamic phone number into imprint
    if (key === 'imprint') {
      body = `
        <p>Ιδιοκτήτης: Mira Cars ΕΠΕ<br/>
        Έδρα: Ηράκλειο Κρήτης, Ελλάδα<br/>
        Τηλέφωνο: ${phoneNumber}<br/>
        Email: ${adminEmail}</p>
        <p>Αυτή η ιστοσελίδα έχει σχεδιαστεί ως δείγμα. Για επίσημες νομικές πληροφορίες συμβουλευτείτε τις αρμόδιες αρχές και έναν δικηγόρο.</p>
      `;
    }
    document.getElementById('modal-title').textContent = entry.title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-overlay').classList.remove('hidden');
  };
  window.closeModal = function () {
    document.getElementById('modal-overlay').classList.add('hidden');
  };

  /**
   * Toggle mobile menu
   */
  window.toggleMenu = function () {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
  };

  /**
   * Open settings panel
   */
  window.openSettings = function () {
    document.getElementById('settings-panel').classList.remove('hidden');
  };
  window.closeSettings = function () {
    document.getElementById('settings-panel').classList.add('hidden');
  };

  /**
   * Save settings from the settings panel
   */
  window.saveSettings = function () {
    phoneNumber = document.getElementById('phone-input').value.trim() || DEFAULTS.phoneNumber;
    vipCode = document.getElementById('vip-input').value.trim() || DEFAULTS.vipCode;
    vipGreeting = document.getElementById('greeting-input').value.trim() || DEFAULTS.vipGreeting;
    // Payment methods – admin enters comma-separated list of names
    const pay = prompt('Εισάγετε τρόπους πληρωμής χωρισμένους με κόμμα (π.χ. Πληρωμή στην παραλαβή, Κάρτα (Stripe), PayPal, Κατάθεση σε Τράπεζα, Apple Pay, Google Pay, Revolut, Viva Wallet, Crypto):', paymentMethods.join(', '));
    if (pay) {
      paymentMethods = pay.split(',').map((m) => m.trim()).filter(Boolean);
      saveSetting('paymentMethods', paymentMethods);
    }
    // Car categories with prices per day
    const catInput = prompt('Εισάγετε κατηγορίες και τιμές/ημέρα χωρισμένες με κόμμα (π.χ. Economy:30, SUV:50, Luxury:90):', Object.entries(carCategories).map(([k,v]) => `${k}:${v}`).join(', '));
    if (catInput) {
      const newCats = {};
      catInput.split(',').forEach((pair) => {
        const [name, price] = pair.split(':').map((s) => s.trim());
        if (name && price && !isNaN(parseFloat(price))) {
          newCats[name] = parseFloat(price);
        }
      });
      if (Object.keys(newCats).length) {
        carCategories = newCats;
        saveSetting('carCategories', carCategories);
      }
    }
    // Extras with prices per day
    const extrasInput = prompt('Εισάγετε extras και τιμές/ημέρα χωρισμένες με κόμμα (π.χ. GPS:5, Παιδικό Κάθισμα:6, Πρόσθετος Οδηγός:7, Πλήρης Ασφάλεια:10):', Object.entries(extras).map(([k,v]) => `${k}:${v}`).join(', '));
    if (extrasInput) {
      const newExtras = {};
      extrasInput.split(',').forEach((pair) => {
        const [name, price] = pair.split(':').map((s) => s.trim());
        if (name && price && !isNaN(parseFloat(price))) {
          newExtras[name] = parseFloat(price);
        }
      });
      if (Object.keys(newExtras).length) {
        extras = newExtras;
        saveSetting('extras', extras);
      }
    }
    // Deposit percentage
    const depInput = prompt('Εισάγετε ποσοστό προκαταβολής (0-100). Αφήστε κενό για 0%:', depositPercent);
    if (depInput !== null) {
      const parsed = parseFloat(depInput);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        depositPercent = parsed;
        saveSetting('depositPercent', depositPercent);
      }
    }
    // Update admin email
    const emailPrompt = prompt('Εισάγετε email διαχειριστή (για παραλαβή κρατήσεων):', adminEmail);
    if (emailPrompt) {
      adminEmail = emailPrompt.trim();
      saveSetting('adminEmail', adminEmail);
    }
    // Persist basic settings
    saveSetting('phoneNumber', phoneNumber);
    saveSetting('vipCode', vipCode);
    saveSetting('vipGreeting', vipGreeting);
    // Prompt for WhatsApp usage
    const waInput = prompt('Θέλετε το κουμπί συνομιλίας να ανοίγει WhatsApp; (ναι/όχι)', useWhatsApp ? 'ναι' : 'όχι');
    if (waInput !== null) {
      const lowered = waInput.toLowerCase().trim();
      useWhatsApp = lowered === 'ναι' || lowered === 'yes';
    }
    saveSetting('useWhatsApp', useWhatsApp);
    // Refresh selects, extras and VIP nav
    populateBookingSelects();
    populateExtras();
    calculatePrice();
    updateVIPNav();
    alert('Οι ρυθμίσεις αποθηκεύτηκαν.');
    closeSettings();
  };

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);
})();