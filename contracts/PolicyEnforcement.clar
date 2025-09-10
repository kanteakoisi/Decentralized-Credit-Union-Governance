(define-constant ERR-NOT-AUTHORIZED u401)
(define-constant ERR-INVALID-POLICY-ID u402)
(define-constant ERR-INVALID-INTEREST-RATE u403)
(define-constant ERR-INVALID-MAX-LOAN u404)
(define-constant ERR-INVALID-MIN-COLLATERAL u405)
(define-constant ERR-INVALID-PROPOSER u406)
(define-constant ERR-INVALID-APPROVAL-HEIGHT u407)
(define-constant ERR-POLICY-ALREADY-EXISTS u408)
(define-constant ERR-NO-ACTIVE-POLICY u409)
(define-constant ERR-INVALID-LOAN-AMOUNT u410)
(define-constant ERR-INSUFFICIENT-COLLATERAL u411)
(define-constant ERR-LOAN-NOT-ALLOWED u412)
(define-constant ERR-INVALID-REPAYMENT-TERM u413)
(define-constant ERR-INVALID-CREDIT-SCORE u414)
(define-constant ERR-INVALID-MEMBER-STATUS u415)
(define-constant ERR-POLICY-NOT-FOUND u416)
(define-constant ERR-INVALID-UPDATE-PARAM u417)
(define-constant ERR-MAX-POLICIES-EXCEEDED u418)
(define-constant ERR-INVALID-POLICY-TYPE u419)
(define-constant ERR-INVALID-GRACE-PERIOD u420)
(define-constant ERR-INVALID-PENALTY-RATE u421)
(define-constant ERR-INVALID-CURRENCY u422)
(define-constant ERR-INVALID-LOCATION-RESTRICTION u423)
(define-constant ERR-INVALID-MIN-LOAN u424)
(define-constant ERR-INVALID-MAX-REPAYMENT u425)
(define-constant ERR-VOTING-CONTRACT-NOT-SET u426)

(define-data-var next-policy-id uint u0)
(define-data-var max-policies uint u100)
(define-data-var voting-contract (optional principal) none)
(define-data-var active-policy-id (optional uint) none)

(define-map policies
  uint
  {
    interest-rate: uint,
    max-loan-amount: uint,
    min-loan-amount: uint,
    min-collateral: uint,
    max-repayment-term: uint,
    min-credit-score: uint,
    grace-period: uint,
    penalty-rate: uint,
    policy-type: (string-utf8 50),
    currency: (string-utf8 20),
    location-restriction: (string-utf8 100),
    proposer: principal,
    approved-at: uint,
    is-active: bool
  }
)

(define-map policy-history
  uint
  {
    updates: (list 50 { updater: principal, timestamp: uint, changes: (string-utf8 256) })
  }
)

(define-private (validate-interest-rate (rate uint))
  (if (and (> rate u0) (<= rate u2000))
      (ok true)
      (err ERR-INVALID-INTEREST-RATE)))

(define-private (validate-max-loan (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-MAX-LOAN)))

(define-private (validate-min-loan (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-MIN-LOAN)))

(define-private (validate-min-collateral (coll uint))
  (if (>= coll u0)
      (ok true)
      (err ERR-INVALID-MIN-COLLATERAL)))

(define-private (validate-max-repayment (term uint))
  (if (> term u0)
      (ok true)
      (err ERR-INVALID-MAX-REPAYMENT)))

(define-private (validate-min-credit-score (score uint))
  (if (and (>= score u0) (<= score u1000))
      (ok true)
      (err ERR-INVALID-CREDIT-SCORE)))

(define-private (validate-grace-period (period uint))
  (if (<= period u90)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD)))

(define-private (validate-penalty-rate (rate uint))
  (if (<= rate u5000)
      (ok true)
      (err ERR-INVALID-PENALTY-RATE)))

(define-private (validate-policy-type (ptype (string-utf8 50)))
  (if (or (is-eq ptype u"personal") (is-eq ptype u"business") (is-eq ptype u"eco-friendly"))
      (ok true)
      (err ERR-INVALID-POLICY-TYPE)))

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur u"STX") (is-eq cur u"USD") (is-eq cur u"BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY)))

(define-private (validate-location-restriction (loc (string-utf8 100)))
  (if (<= (len loc) u100)
      (ok true)
      (err ERR-INVALID-LOCATION-RESTRICTION)))

(define-private (validate-proposer (prop principal))
  (if (not (is-eq prop tx-sender))
      (ok true)
      (err ERR-INVALID-PROPOSER)))

(define-private (validate-approval-height (height uint))
  (if (>= height block-height)
      (ok true)
      (err ERR-INVALID-APPROVAL-HEIGHT)))

(define-public (set-voting-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender (as-contract tx-sender)) (err ERR-NOT-AUTHORIZED))
    (var-set voting-contract (some contract-principal))
    (ok true)))

(define-public (add-policy 
  (interest-rate uint)
  (max-loan-amount uint)
  (min-loan-amount uint)
  (min-collateral uint)
  (max-repayment-term uint)
  (min-credit-score uint)
  (grace-period uint)
  (penalty-rate uint)
  (policy-type (string-utf8 50))
  (currency (string-utf8 20))
  (location-restriction (string-utf8 100))
  (proposer principal))
  (let ((next-id (var-get next-policy-id))
        (current-max (var-get max-policies))
        (voter (unwrap! (var-get voting-contract) (err ERR-VOTING-CONTRACT-NOT-SET))))
    (asserts! (is-eq tx-sender voter) (err ERR-NOT-AUTHORIZED))
    (asserts! (< next-id current-max) (err ERR-MAX-POLICIES-EXCEEDED))
    (try! (validate-interest-rate interest-rate))
    (try! (validate-max-loan max-loan-amount))
    (try! (validate-min-loan min-loan-amount))
    (try! (validate-min-collateral min-collateral))
    (try! (validate-max-repayment max-repayment-term))
    (try! (validate-min-credit-score min-credit-score))
    (try! (validate-grace-period grace-period))
    (try! (validate-penalty-rate penalty-rate))
    (try! (validate-policy-type policy-type))
    (try! (validate-currency currency))
    (try! (validate-location-restriction location-restriction))
    (try! (validate-proposer proposer))
    (map-set policies next-id
      {
        interest-rate: interest-rate,
        max-loan-amount: max-loan-amount,
        min-loan-amount: min-loan-amount,
        min-collateral: min-collateral,
        max-repayment-term: max-repayment-term,
        min-credit-score: min-credit-score,
        grace-period: grace-period,
        penalty-rate: penalty-rate,
        policy-type: policy-type,
        currency: currency,
        location-restriction: location-restriction,
        proposer: proposer,
        approved-at: block-height,
        is-active: true
      })
    (var-set active-policy-id (some next-id))
    (var-set next-policy-id (+ next-id u1))
    (map-set policy-history next-id { updates: (list) })
    (print { event: "policy-added", id: next-id })
    (ok next-id)))

(define-public (update-policy 
  (policy-id uint)
  (new-interest-rate uint)
  (new-max-loan-amount uint)
  (new-min-loan-amount uint)
  (new-min-collateral uint))
  (let ((policy (map-get? policies policy-id))
        (voter (unwrap! (var-get voting-contract) (err ERR-VOTING-CONTRACT-NOT-SET))))
    (match policy
      p
      (begin
        (asserts! (is-eq tx-sender voter) (err ERR-NOT-AUTHORIZED))
        (try! (validate-interest-rate new-interest-rate))
        (try! (validate-max-loan new-max-loan-amount))
        (try! (validate-min-loan new-min-loan-amount))
        (try! (validate-min-collateral new-min-collateral))
        (map-set policies policy-id
          (merge p {
            interest-rate: new-interest-rate,
            max-loan-amount: new-max-loan-amount,
            min-loan-amount: new-min-loan-amount,
            min-collateral: new-min-collateral
          }))
        (let ((hist (unwrap! (map-get? policy-history policy-id) (err ERR-POLICY-NOT-FOUND)))
              (new-updates (append (get updates hist) { updater: tx-sender, timestamp: block-height, changes: u"updated rates and amounts" })))
          (map-set policy-history policy-id { updates: new-updates }))
        (print { event: "policy-updated", id: policy-id })
        (ok true))
      (err ERR-POLICY-NOT-FOUND))))

(define-public (deactivate-policy (policy-id uint))
  (let ((policy (map-get? policies policy-id))
        (voter (unwrap! (var-get voting-contract) (err ERR-VOTING-CONTRACT-NOT-SET))))
    (match policy
      p
      (begin
        (asserts! (is-eq tx-sender voter) (err ERR-NOT-AUTHORIZED))
        (map-set policies policy-id (merge p { is-active: false }))
        (if (is-eq (some policy-id) (var-get active-policy-id))
            (var-set active-policy-id none)
            true)
        (print { event: "policy-deactivated", id: policy-id })
        (ok true))
      (err ERR-POLICY-NOT-FOUND))))

(define-public (validate-loan 
  (loan-amount uint)
  (collateral uint)
  (repayment-term uint)
  (credit-score uint)
  (member-location (string-utf8 100))
  (currency (string-utf8 20)))
  (let ((active-id (unwrap! (var-get active-policy-id) (err ERR-NO-ACTIVE-POLICY)))
        (policy (unwrap! (map-get? policies active-id) (err ERR-POLICY-NOT-FOUND))))
    (asserts! (>= loan-amount (get min-loan-amount policy)) (err ERR-INVALID-LOAN-AMOUNT))
    (asserts! (<= loan-amount (get max-loan-amount policy)) (err ERR-INVALID-LOAN-AMOUNT))
    (asserts! (>= collateral (get min-collateral policy)) (err ERR-INSUFFICIENT-COLLATERAL))
    (asserts! (<= repayment-term (get max-repayment-term policy)) (err ERR-INVALID-REPAYMENT-TERM))
    (asserts! (>= credit-score (get min-credit-score policy)) (err ERR-INVALID-CREDIT-SCORE))
    (asserts! (is-eq currency (get currency policy)) (err ERR-INVALID-CURRENCY))
    (if (is-eq (get location-restriction policy) u"none")
        (ok true)
        (asserts! (is-eq member-location (get location-restriction policy)) (err ERR-LOAN-NOT-ALLOWED)))
    (ok true)))

(define-read-only (get-policy (id uint))
  (map-get? policies id))

(define-read-only (get-active-policy)
  (let ((active-id (var-get active-policy-id)))
    (match active-id pid (map-get? policies pid) none)))

(define-read-only (get-policy-history (id uint))
  (map-get? policy-history id))

(define-read-only (get-policy-count)
  (var-get next-policy-id))

(define-read-only (is-policy-active (id uint))
  (match (map-get? policies id) p (get is-active p) false))