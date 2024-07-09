const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const app = require('../server'); 
const db = require('../db'); 

// Close the database connection after all tests
afterAll(done => {
  db.close(err => {
    if (err) {
      console.error(err.message);
      return done(err);
    }
    console.log('Closed the SQLite database connection.');
    done();
  });
});

// Clear the FinanceTerms table before each test
beforeEach(done => {
  db.run('DELETE FROM FinanceTerms', err => {
    if (err) {
      console.error('Error clearing FinanceTerms table:', err.message);
      return done(err);
    }
    console.log('Cleared FinanceTerms table.');
    done();
  });
});

describe('POST /finance-terms', () => {
  it('should create finance terms and return status 201', async () => {
    const newTerms = {
      insurancePolicies: [
        { premium: 100, taxFee: 10 },
        { premium: 150, taxFee: 15 }
      ],
      dueDate: '2024-07-31'
    };

    const response = await request(app)
      .post('/finance-terms')
      .send(newTerms);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.insurancePolicies).toEqual(newTerms.insurancePolicies);
    expect(response.body.dueDate).toBe(newTerms.dueDate);
    expect(response.body.status).toBe('pending');
  });

it('should handle invalid request with status 400', async () => {
  const invalidTerms = {
    insurancePolicies: [],
    dueDate: '2024-07-31'
  };

  const response = await request(app)
    .post('/finance-terms')
    .send(invalidTerms);

  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('error');
});
});

describe('PATCH /finance-terms/:id/agree', () => {
  it('should update status to "agreed" and return updated finance terms', async () => {
  // Insert a sample finance term into the database
  const insertQuery = `INSERT INTO FinanceTerms (insurancePolicies, downpayment, dueDate, amountFinanced, status)
                      VALUES (?, ?, ?, ?, ?)`;
  const values = [
    JSON.stringify([{ premium: 200, taxFee: 20 }]),
    50,
    '2024-08-15',
    170,
    'pending'
  ];

  // Insert the data into the database
  await new Promise((resolve, reject) => {
    db.run(insertQuery, values, function(err) {
      if (err) {
        console.error('Error inserting sample data:', err.message);
        return reject(err);
      }
      resolve(this.lastID); 
    });
  });

  // Retrieve the ID of the inserted record
  const id = await new Promise((resolve, reject) => {
    db.get('SELECT last_insert_rowid() as id', (err, row) => {
      if (err) {
        console.error('Error retrieving last inserted ID:', err.message);
        return reject(err);
      }
      resolve(row.id);
    });
  });

  const response = await request(app)
    .patch(`/finance-terms/${id}/agree`)
    .expect(200);

  expect(response.body.id).toBe(id);
  expect(response.body.status).toBe('agreed');
});
});

describe('GET /finance-terms', () => {
it('GET /finance-terms should return an object of finance terms', async () => {
  const response = await request(app).get('/finance-terms');
  expect(response.status).toBe(200);
  expect(response.body).toBeInstanceOf(Object);
});
});
