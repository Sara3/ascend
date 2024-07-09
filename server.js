const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose(); 
const db = require('./db'); 

const app = express();
app.use(bodyParser.json());

// Helper function to get finance terms by ID
function getFinanceTermsById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM FinanceTerms WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

app.post('/finance-terms', async (req, res) => {
  try {
    const { insurancePolicies, dueDate } = req.body;

    if (!insurancePolicies || insurancePolicies.length === 0) {
      return res.status(400).json({ error: 'Insurance policies are required.' });
    }

    let totalPremium = 0;
    let totalTaxFee = 0;

    insurancePolicies.forEach(policy => {
      totalPremium += policy.premium;
      totalTaxFee += policy.taxFee;
    });

    const downpayment = (totalPremium * 0.20) + totalTaxFee;
    const amountFinanced = (totalPremium + totalTaxFee) - downpayment;

    db.run(`INSERT INTO FinanceTerms (insurancePolicies, downpayment, dueDate, amountFinanced, status)
            VALUES (?, ?, ?, ?, ?)`,
            [JSON.stringify(insurancePolicies), downpayment, dueDate, amountFinanced, 'pending'],
            function(err) {
              if (err) {
                return res.status(400).json({ error: err.message });
              }
              res.status(201).json({
                id: this.lastID,
                insurancePolicies,
                downpayment,
                dueDate,
                amountFinanced,
                status: 'pending'
              });
      });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to agree to finance terms
app.patch('/finance-terms/:id/agree', async (req, res) => {
  try {
    db.run(`UPDATE FinanceTerms SET status = 'agreed' WHERE id = ?`,
           [req.params.id],
           async function(err) {
             if (err) {
               return res.status(400).json({ error: err.message });
             }
             const financeTerms = await getFinanceTermsById(req.params.id);
             res.json(financeTerms);
           });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.get('/finance-terms', async (req, res) => {
  try {
    const { downpayment, status, sort } = req.query;
    let filter = [];
    let sql = 'SELECT * FROM FinanceTerms';

    if (downpayment || status) {
      sql += ' WHERE';
      if (downpayment) {
        const operator = downpayment[0]; // Extract the operator (>, <, =)
        const amount = downpayment.slice(1); // Extract the numeric value after the operator
        switch (operator) {
          case '>':
            sql += ' downpayment > ?';
            break;
          case '<':
            sql += ' downpayment < ?';
            break;
          case '=':
            sql += ' downpayment = ?';
            break;
          default:
            return res.status(400).json({ error: 'Invalid downpayment operator.' });
        }
        filter.push(amount);
      }
      if (status) {
        sql += filter.length > 0 ? ' AND status = ?' : ' status = ?';
        filter.push(status);
      }
    }

    if (sort) {
      const [field, order] = sort.split(':');
      sql += ` ORDER BY ${field} ${order === 'desc' ? 'DESC' : 'ASC'}`;
    }

    db.all(sql, filter, (err, financeTerms) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json(financeTerms);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  // Only listen when file is run directly, not when required (as in tests)
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
