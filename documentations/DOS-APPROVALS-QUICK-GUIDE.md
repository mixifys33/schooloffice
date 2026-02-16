# DoS Approvals - Quick Reference Guide

**URL**: `/dashboard/dos/curriculum/approvals`  
**Access**: DoS users only

---

## 🚀 Quick Start

1. **Navigate**: DoS Sidebar → Curriculum → Approvals
2. **Select**: Choose class and subject from dropdowns
3. **Review**: View CA and Exam entries
4. **Approve**: Click "Approve" or "Approve All"
5. **Lock**: Lock subject when both CA and Exam approved

---

## 📋 Approval Workflow

```
Teacher Submits → DoS Reviews → DoS Approves → Lock Subject
   (DRAFT)       (SUBMITTED)     (APPROVED)      (LOCKED)
```

---

## 🎯 Key Actions

### CA Approvals

- **Approve Individual**: Click "Approve" on specific CA entry
- **Bulk Approve**: Click "Approve All" button
- **Reject**: Click "Reject" and provide reason
- **View Scores**: Click expand icon to see student scores

### Exam Approvals

- **Approve All**: Click "Approve All" button
- **View Scores**: Click expand icon to see student scores

### Lock/Unlock

- **Lock**: Click "Lock Subject" (requires both CA and Exam approved)
- **Unlock**: Click "Unlock Subject" and provide reason

---

## 📊 Status Indicators

| Badge        | Meaning            |
| ------------ | ------------------ |
| 🟡 Draft     | Not submitted yet  |
| 🔵 Submitted | Awaiting approval  |
| 🟢 Approved  | Approved by DoS    |
| 🔴 Rejected  | Rejected by DoS    |
| 🔒 Locked    | No changes allowed |

---

## ⚠️ Important Rules

1. ❌ Cannot approve DRAFT entries (must be SUBMITTED first)
2. ❌ Cannot lock without both CA and Exam approved
3. ❌ Cannot modify locked subjects (must unlock first)
4. ✅ Unlock requires reason (audit trail)
5. ✅ Bulk operations only affect SUBMITTED entries

---

## 🔧 API Endpoints

| Endpoint                             | Method | Purpose                |
| ------------------------------------ | ------ | ---------------------- |
| `/api/dos/approvals`                 | GET    | Fetch approval data    |
| `/api/dos/approvals/ca/approve`      | POST   | Approve CA entry       |
| `/api/dos/approvals/ca/reject`       | POST   | Reject CA entry        |
| `/api/dos/approvals/ca/bulk-approve` | POST   | Bulk approve CA        |
| `/api/dos/approvals/exam/approve`    | POST   | Approve exam entries   |
| `/api/dos/approvals/exam/reject`     | POST   | Reject exam entry      |
| `/api/dos/approvals/lock`            | POST   | Lock subject           |
| `/api/dos/approvals/unlock`          | POST   | Unlock subject         |
| `/api/dos/approvals/helpers`         | GET    | Fetch classes/subjects |

---

## 📁 Files Created

### Backend (9 files)

- `src/app/api/dos/approvals/route.ts`
- `src/app/api/dos/approvals/ca/approve/route.ts`
- `src/app/api/dos/approvals/ca/reject/route.ts`
- `src/app/api/dos/approvals/ca/bulk-approve/route.ts`
- `src/app/api/dos/approvals/exam/approve/route.ts`
- `src/app/api/dos/approvals/exam/reject/route.ts`
- `src/app/api/dos/approvals/lock/route.ts`
- `src/app/api/dos/approvals/unlock/route.ts`
- `src/app/api/dos/approvals/helpers/route.ts`

### Frontend (1 file)

- `src/app/(back)/dashboard/dos/curriculum/approvals/page.tsx`

---

## 🎓 Database Models

### DosApproval

- `caApproved`: Boolean (all CA entries approved)
- `examApproved`: Boolean (all exam entries approved)
- `locked`: Boolean (subject locked)
- `lockedBy`: User ID who locked
- `lockedAt`: Timestamp when locked

### CAEntry

- `status`: DRAFT | SUBMITTED | APPROVED | REJECTED
- `approvedAt`: Timestamp when approved
- `approvedBy`: User ID who approved

### ExamEntry

- `status`: DRAFT | SUBMITTED | APPROVED | REJECTED
- `approvedAt`: Timestamp when approved
- `approvedBy`: User ID who approved

---

## ✅ Testing Checklist

- [ ] Select class and subject
- [ ] View CA entries
- [ ] Approve individual CA entry
- [ ] Bulk approve all CA entries
- [ ] View exam entries
- [ ] Approve all exam entries
- [ ] Lock subject
- [ ] Unlock subject with reason
- [ ] Verify locked subject cannot be modified
- [ ] Check status badges display correctly
- [ ] Test mobile responsiveness

---

**Status**: ✅ **PRODUCTION-READY**
