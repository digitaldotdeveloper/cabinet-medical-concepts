'use strict';
// French / English strings + date helpers, shared by the app and the printable report.

// The doctor's own sheet (Excel template): HISTOIRE | LABORATOIRE | RADIO | PRESCRIPTION, labels as she writes them.
// History: the first six live in patients.history (JSON); the last four reuse the original patient columns.
const HISTORY_ITEMS = [
  ['smoking', 'Smoking'], ['diabetes', 'Diabetes'], ['hta', 'HTA'], ['lipids', 'Lipids'], ['thyroid', 'Thyroid'], ['bone', 'Bone'],
  ['psh', 'PSH', 'surgical_history'], ['pmh', 'PMH', 'conditions'], ['family', 'Family H.', 'family_history'], ['drugs', 'Drugs', 'medications'],
];
const historyValue = (p, [key, , col]) => (col ? p[col] : (p.history || {})[key]) || '';
// Lab results are stored per consultation in visits.labs (JSON: key -> result), in the sheet's order.
const LAB_TESTS = [
  ['cbc', 'CBC'], ['esr', 'ESR'], ['glucose', 'Glucose'], ['hba1c', 'HbA1c'], ['ct', 'CT'], ['tg', 'TG'], ['hdl', 'HDL'],
  ['ldl', 'LDL'], ['creat', 'Créatinine'], ['uree', 'Urée'], ['k', 'K⁺'], ['sgpt', 'SGPT'], ['sgot', 'SGOT'],
  ['ck', 'CK'], ['ca', 'Ca'], ['vitd', '25OHD3'], ['b12', 'Vit B12'], ['tsh', 'TSH'], ['ft4', 'FT4'], ['urine', 'Urine'],
  ['acr', 'ACR'], ['us_thyroid', 'US Thyroïde'], ['us_abdo', 'US Abdomen'], ['renin', 'Rénine'], ['aldo', 'Aldostérone'],
  ['catech', 'Catécholamines'],
];
const RADIO_ITEMS = [['mri', 'MRI'], ['other', null]];   // null label -> t('tpl.other')

const I18N = {
  fr: {
    'app.name': 'Cabinet Médical',
    'nav.home': 'Accueil', 'nav.patients': 'Patients', 'nav.agenda': 'Agenda', 'nav.settings': 'Réglages',
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.delete': 'Supprimer', 'common.edit': 'Modifier',
    'common.add': 'Ajouter', 'common.close': 'Fermer', 'common.loading': 'Chargement…', 'common.none': '—',
    'common.copy': 'Copier', 'common.copied': 'Copié', 'common.saved': 'Enregistré', 'common.years': 'ans',
    'common.confirm_delete': 'Supprimer définitivement ? Cette action est irréversible.',
    'setup.title': 'Bienvenue', 'setup.intro': 'Créez le mot de passe qui protégera les dossiers de vos patients.',
    'setup.doctor': 'Nom du médecin', 'setup.specialty': 'Spécialité', 'setup.password': 'Mot de passe (8 caractères min.)',
    'setup.password2': 'Confirmer le mot de passe', 'setup.go': 'Commencer', 'setup.mismatch': 'Les mots de passe ne correspondent pas.',
    'login.title': 'Connexion', 'login.password': 'Mot de passe', 'login.go': 'Se connecter', 'login.logout': 'Se déconnecter',
    'home.hello': 'Bonjour Docteur !', 'home.search': 'Rechercher un patient : nom, téléphone, n° de dossier…',
    'home.today': "Rendez-vous d'aujourd'hui", 'home.no_today': "Aucun rendez-vous aujourd'hui.", 'home.recent': 'Patients récents',
    'home.no_results': 'Aucun patient trouvé.', 'home.create_named': 'Créer le patient « {q} »',
    'patients.title': 'Patients', 'patients.new': 'Nouveau patient', 'patients.empty': 'Aucun patient pour le moment.',
    'patients.last_visit': 'Dernière visite', 'patients.count': '{n} patient(s)',
    'patient.file_no': 'N° dossier', 'patient.first_name': 'Prénom', 'patient.last_name': 'Nom', 'patient.sex': 'Sexe',
    'patient.sex.M': 'Homme', 'patient.sex.F': 'Femme', 'patient.dob': 'Date de naissance', 'patient.age': 'Âge',
    'patient.phone': 'Téléphone', 'patient.email': 'E-mail', 'patient.address': 'Adresse', 'patient.profession': 'Profession',
    'patient.blood_type': 'Groupe sanguin', 'patient.allergies': 'Allergies', 'patient.conditions': 'Antécédents médicaux',
    'patient.surgical_history': 'Antécédents chirurgicaux', 'patient.family_history': 'Antécédents familiaux',
    'patient.medications': 'Traitement en cours', 'patient.notes': 'Notes',
    'patient.section.identity': 'Identité', 'patient.section.contact': 'Coordonnées', 'patient.section.medical': 'Dossier médical',
    'patient.file_no_hint': 'Laisser vide pour une numérotation automatique',
    'patient.print': 'Imprimer le dossier', 'patient.new_visit': 'Nouvelle consultation', 'patient.new_appt': 'Nouveau RDV',
    'patient.visits': 'Consultations', 'patient.no_visits': 'Aucune consultation enregistrée.',
    'patient.appointments': 'Rendez-vous', 'patient.no_appts': 'Aucun rendez-vous.', 'patient.summary': 'Résumé médical',
    'patient.allergy_alert': 'Allergies', 'patient.edit_title': 'Modifier le patient', 'patient.new_title': 'Nouveau patient',
    'visit.title': 'Consultation', 'visit.date': 'Date', 'visit.reason': 'Motif', 'visit.vitals': 'Constantes',
    'visit.bp': 'Tension (mmHg)', 'visit.pulse': 'Pouls (bpm)', 'visit.temp': 'Temp. (°C)', 'visit.weight': 'Poids (kg)',
    'visit.height': 'Taille (cm)', 'visit.exam': 'Examen clinique', 'visit.diagnosis': 'Diagnostic',
    'visit.treatment': 'Prescription', 'visit.notes': 'Notes',
    'patient.tiers_payant': 'Tiers payant', 'patient.section.history': 'Histoire', 'patient.section.other': 'Autres informations',
    'tpl.lab': 'Laboratoire', 'tpl.radio': 'Radio', 'tpl.prescription': 'Prescription', 'tpl.other': 'Autre',
    'patient.followup': 'Suivi', 'patient.followup_hint': 'Laboratoire, radio et prescription de chaque consultation. Touchez une valeur pour la modifier.',
    'patient.show_all_rows': 'Toutes les lignes', 'patient.show_filled_rows': 'Lignes remplies',
    'patient.no_followup': 'Aucun résultat pour le moment. Ajoutez une consultation avec ses analyses, radios et prescription.',
    'appt.title': 'Rendez-vous', 'appt.patient': 'Patient', 'appt.patient_search': 'Chercher un patient…',
    'appt.no_patient': 'Sans dossier (saisir le nom dans le motif)', 'appt.change': 'Changer',
    'appt.date': 'Date', 'appt.time': 'Heure', 'appt.duration': 'Durée', 'appt.minutes': 'min',
    'appt.reason': 'Motif', 'appt.notes': 'Notes', 'appt.status': 'Statut',
    'appt.status.scheduled': 'Prévu', 'appt.status.done': 'Vu', 'appt.status.cancelled': 'Annulé', 'appt.status.noshow': 'Absent',
    'agenda.title': 'Agenda', 'agenda.today': "Aujourd'hui", 'agenda.week': 'Semaine du {d}', 'agenda.empty': 'Libre',
    'agenda.cal_hint': 'Ces rendez-vous apparaissent aussi dans Calendrier sur le Mac et l’iPhone.',
    'settings.title': 'Réglages', 'settings.letterhead': 'En-tête des rapports',
    'settings.letterhead_hint': 'Ces informations apparaissent en haut de chaque dossier imprimé.',
    'settings.doctor_name': 'Nom du médecin', 'settings.specialty': 'Spécialité', 'settings.address': 'Adresse du cabinet',
    'settings.phone': 'Téléphone', 'settings.email': 'E-mail', 'settings.reg_no': "N° d'inscription à l'Ordre",
    'settings.language': 'Langue', 'settings.calendar': 'Calendrier Apple (iPhone & Mac)',
    'settings.cal_name': 'Nom du calendrier', 'settings.cal_privacy': 'Afficher dans le calendrier',
    'settings.cal_privacy.full': 'Nom du patient, motif et téléphone', 'settings.cal_privacy.initials': 'Initiales et motif seulement',
    'settings.cal_privacy.none': 'Seulement « RDV » (aucune donnée patient)',
    'settings.cal_url': "Lien d'abonnement", 'settings.cal_subscribe': 'S’abonner sur cet appareil',
    'settings.cal_regen': 'Générer un nouveau lien', 'settings.cal_regen_confirm': "L'ancien lien cessera de fonctionner sur tous les appareils. Continuer ?",
    'settings.cal_help_iphone': '<b>iPhone :</b> touchez « S’abonner sur cet appareil » dans Safari, ou Réglages → Calendrier → Comptes → Ajouter un compte → Autre → Ajouter un calendrier avec abonnement, puis collez le lien.',
    'settings.cal_help_mac': '<b>Mac :</b> app Calendrier → Fichier → Nouvel abonnement à un calendrier… → collez le lien. Choisissez « iCloud » comme emplacement pour le retrouver aussi sur l’iPhone.',
    'settings.cal_help_note': 'Le calendrier est mis à jour automatiquement (toutes les 15 min environ). Les rendez-vous se créent et se modifient ici, dans le logiciel.',
    'settings.security': 'Sécurité', 'settings.current_pw': 'Mot de passe actuel', 'settings.new_pw': 'Nouveau mot de passe',
    'settings.change_pw': 'Changer le mot de passe', 'settings.pw_changed': 'Mot de passe modifié.',
    'settings.backup': 'Sauvegarde', 'settings.backup_hint': 'Téléchargez une copie complète de tous les dossiers. À faire chaque semaine et à conserver en lieu sûr.',
    'settings.backup_go': 'Télécharger la sauvegarde',
    'report.title': 'Dossier médical — historique complet', 'report.print': 'Imprimer / PDF', 'report.back': 'Retour',
    'report.identity': 'Identité du patient', 'report.printed_on': 'Imprimé le {d}', 'report.signature': 'Signature et cachet',
    'report.confidential': 'Document médical confidentiel', 'report.visit_count': '{n} consultation(s)',
    'err.wrong_password': 'Mot de passe incorrect.', 'err.too_many_attempts': 'Trop de tentatives. Réessayez dans 15 minutes.',
    'err.password_too_short': 'Le mot de passe doit contenir au moins 8 caractères.', 'err.name_required': 'Le nom et le prénom sont obligatoires.',
    'err.file_no_taken': 'Ce numéro de dossier existe déjà.', 'err.date_required': 'La date est obligatoire.',
    'err.start_required': 'La date et l’heure sont obligatoires.', 'err.patient_or_title_required': 'Choisissez un patient ou saisissez un motif.',
    'err.not_found': 'Introuvable.', 'err.network': 'Connexion au serveur impossible.', 'err.generic': 'Une erreur est survenue.',
  },
  en: {
    'app.name': 'Medical Practice',
    'nav.home': 'Home', 'nav.patients': 'Patients', 'nav.agenda': 'Agenda', 'nav.settings': 'Settings',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit',
    'common.add': 'Add', 'common.close': 'Close', 'common.loading': 'Loading…', 'common.none': '—',
    'common.copy': 'Copy', 'common.copied': 'Copied', 'common.saved': 'Saved', 'common.years': 'y',
    'common.confirm_delete': 'Delete permanently? This cannot be undone.',
    'setup.title': 'Welcome', 'setup.intro': 'Create the password that will protect your patient records.',
    'setup.doctor': 'Doctor name', 'setup.specialty': 'Specialty', 'setup.password': 'Password (min. 8 characters)',
    'setup.password2': 'Confirm password', 'setup.go': 'Get started', 'setup.mismatch': 'Passwords do not match.',
    'login.title': 'Sign in', 'login.password': 'Password', 'login.go': 'Sign in', 'login.logout': 'Sign out',
    'home.hello': 'Hello Doctor!', 'home.search': 'Find a patient: name, phone, file number…',
    'home.today': "Today's appointments", 'home.no_today': 'No appointments today.', 'home.recent': 'Recent patients',
    'home.no_results': 'No patient found.', 'home.create_named': 'Create patient “{q}”',
    'patients.title': 'Patients', 'patients.new': 'New patient', 'patients.empty': 'No patients yet.',
    'patients.last_visit': 'Last visit', 'patients.count': '{n} patient(s)',
    'patient.file_no': 'File no.', 'patient.first_name': 'First name', 'patient.last_name': 'Last name', 'patient.sex': 'Sex',
    'patient.sex.M': 'Male', 'patient.sex.F': 'Female', 'patient.dob': 'Date of birth', 'patient.age': 'Age',
    'patient.phone': 'Phone', 'patient.email': 'Email', 'patient.address': 'Address', 'patient.profession': 'Occupation',
    'patient.blood_type': 'Blood type', 'patient.allergies': 'Allergies', 'patient.conditions': 'Medical history',
    'patient.surgical_history': 'Surgical history', 'patient.family_history': 'Family history',
    'patient.medications': 'Current medication', 'patient.notes': 'Notes',
    'patient.section.identity': 'Identity', 'patient.section.contact': 'Contact', 'patient.section.medical': 'Medical record',
    'patient.file_no_hint': 'Leave empty for automatic numbering',
    'patient.print': 'Print record', 'patient.new_visit': 'New consultation', 'patient.new_appt': 'New appointment',
    'patient.visits': 'Consultations', 'patient.no_visits': 'No consultations recorded.',
    'patient.appointments': 'Appointments', 'patient.no_appts': 'No appointments.', 'patient.summary': 'Medical summary',
    'patient.allergy_alert': 'Allergies', 'patient.edit_title': 'Edit patient', 'patient.new_title': 'New patient',
    'visit.title': 'Consultation', 'visit.date': 'Date', 'visit.reason': 'Reason', 'visit.vitals': 'Vitals',
    'visit.bp': 'Blood pressure (mmHg)', 'visit.pulse': 'Pulse (bpm)', 'visit.temp': 'Temp. (°C)', 'visit.weight': 'Weight (kg)',
    'visit.height': 'Height (cm)', 'visit.exam': 'Clinical exam', 'visit.diagnosis': 'Diagnosis',
    'visit.treatment': 'Prescription', 'visit.notes': 'Notes',
    'patient.tiers_payant': 'Third-party payer', 'patient.section.history': 'History', 'patient.section.other': 'Other information',
    'tpl.lab': 'Laboratory', 'tpl.radio': 'Imaging', 'tpl.prescription': 'Prescription', 'tpl.other': 'Other',
    'patient.followup': 'Follow-up', 'patient.followup_hint': 'Labs, imaging and prescription from each consultation. Tap a value to edit it.',
    'patient.show_all_rows': 'All rows', 'patient.show_filled_rows': 'Filled rows',
    'patient.no_followup': 'No results yet. Add a consultation with its labs, imaging and prescription.',
    'appt.title': 'Appointment', 'appt.patient': 'Patient', 'appt.patient_search': 'Search a patient…',
    'appt.no_patient': 'No file (type the name in the reason)', 'appt.change': 'Change',
    'appt.date': 'Date', 'appt.time': 'Time', 'appt.duration': 'Duration', 'appt.minutes': 'min',
    'appt.reason': 'Reason', 'appt.notes': 'Notes', 'appt.status': 'Status',
    'appt.status.scheduled': 'Scheduled', 'appt.status.done': 'Seen', 'appt.status.cancelled': 'Cancelled', 'appt.status.noshow': 'No-show',
    'agenda.title': 'Agenda', 'agenda.today': 'Today', 'agenda.week': 'Week of {d}', 'agenda.empty': 'Free',
    'agenda.cal_hint': 'These appointments also appear in Calendar on the Mac and iPhone.',
    'settings.title': 'Settings', 'settings.letterhead': 'Report letterhead',
    'settings.letterhead_hint': 'Shown at the top of every printed record.',
    'settings.doctor_name': 'Doctor name', 'settings.specialty': 'Specialty', 'settings.address': 'Practice address',
    'settings.phone': 'Phone', 'settings.email': 'Email', 'settings.reg_no': 'Medical licence no.',
    'settings.language': 'Language', 'settings.calendar': 'Apple Calendar (iPhone & Mac)',
    'settings.cal_name': 'Calendar name', 'settings.cal_privacy': 'Show in the calendar',
    'settings.cal_privacy.full': 'Patient name, reason and phone', 'settings.cal_privacy.initials': 'Initials and reason only',
    'settings.cal_privacy.none': 'Just “RDV” (no patient data)',
    'settings.cal_url': 'Subscription link', 'settings.cal_subscribe': 'Subscribe on this device',
    'settings.cal_regen': 'Generate a new link', 'settings.cal_regen_confirm': 'The old link will stop working on every device. Continue?',
    'settings.cal_help_iphone': '<b>iPhone:</b> tap “Subscribe on this device” in Safari, or Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar, then paste the link.',
    'settings.cal_help_mac': '<b>Mac:</b> Calendar app → File → New Calendar Subscription… → paste the link. Pick “iCloud” as the location so it shows on the iPhone too.',
    'settings.cal_help_note': 'The calendar refreshes automatically (about every 15 min). Appointments are created and edited here, in the app.',
    'settings.security': 'Security', 'settings.current_pw': 'Current password', 'settings.new_pw': 'New password',
    'settings.change_pw': 'Change password', 'settings.pw_changed': 'Password changed.',
    'settings.backup': 'Backup', 'settings.backup_hint': 'Download a complete copy of every record. Do this weekly and keep it somewhere safe.',
    'settings.backup_go': 'Download backup',
    'report.title': 'Medical record — full history', 'report.print': 'Print / PDF', 'report.back': 'Back',
    'report.identity': 'Patient identity', 'report.printed_on': 'Printed on {d}', 'report.signature': 'Signature and stamp',
    'report.confidential': 'Confidential medical document', 'report.visit_count': '{n} consultation(s)',
    'err.wrong_password': 'Wrong password.', 'err.too_many_attempts': 'Too many attempts. Try again in 15 minutes.',
    'err.password_too_short': 'Password must be at least 8 characters.', 'err.name_required': 'First and last name are required.',
    'err.file_no_taken': 'This file number already exists.', 'err.date_required': 'Date is required.',
    'err.start_required': 'Date and time are required.', 'err.patient_or_title_required': 'Pick a patient or type a reason.',
    'err.not_found': 'Not found.', 'err.network': 'Cannot reach the server.', 'err.generic': 'Something went wrong.',
  },
};

let LANG = 'fr';
function setLang(l) { LANG = I18N[l] ? l : 'fr'; document.documentElement.lang = LANG; }
function t(key, vars) {
  let s = I18N[LANG][key] ?? I18N.fr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
const locale = () => (LANG === 'fr' ? 'fr-FR' : 'en-GB');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Multi-line text → safe HTML with line breaks.
const multiline = (s) => esc(s).replace(/\n/g, '<br>');

// 'YYYY-MM-DD' strings are calendar days, so build them as local dates (not UTC).
function dayToDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hm(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function fmtDay(s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!s) return t('common.none');
  const d = typeof s === 'string' && s.length === 10 ? dayToDate(s) : new Date(s);
  return d.toLocaleDateString(locale(), opts);
}
function fmtTime(s) { return new Date(s).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); }
function ageOf(dob) {
  if (!dob) return null;
  const b = dayToDate(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}
