jest.mock("../src/services/emailService", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendActivationEmail: jest.fn().mockResolvedValue(true),
  buildActivationEmail: jest.fn(),
}));

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const createApp = require("../src/app");
const User = require("../src/models/User");
const TravelRequest = require("../src/models/TravelRequest");
const Notification = require("../src/models/Notification");
const { hashPassword } = require("../src/services/passwordService");

let mongoServer;
let app;

async function createUser(overrides = {}) {
  const passwordHash = overrides.passwordHash || (await hashPassword("Password123!"));

  return User.create({
    name: "Test User",
    email: `user-${Math.random().toString(36).slice(2)}@example.com`,
    role: "user",
    isActive: true,
    mustSetPassword: false,
    passwordHash,
    ...overrides,
  });
}

async function login(email, password = "Password123!") {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  return response.body.token;
}

function buildRequestPayload(overrides = {}) {
  return {
    project: {
      name: "WE4R",
      businessUnit: "KEN03",
      fundCode: "DEC16",
      projectId: "CDEUKE3014",
      departmentId: "KE0201",
      activityId: "3",
    },
    assignedAreaOfOperation: "Kisumu and Siaya",
    purposeOfTrip: "Field monitoring visit",
    modeOfTravel: {
      careVehicle: true,
      publicTransport: false,
      aircraft: false,
    },
    itinerary: {
      dateFrom: "2026-07-05T00:00:00.000Z",
      dateTo: "2026-07-07T00:00:00.000Z",
      destination: "Kisumu",
      accommodationNeeded: true,
    },
    passengers: [{ name: "Passenger One", employeeNumber: "1600" }],
    ...overrides,
  };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    TravelRequest.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("authentication and authorization", () => {
  it("logs a user in and returns a JWT token", async () => {
    const user = await createUser({
      name: "Alice User",
      email: "alice@example.com",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.email).toBe(user.email);
  });

  it("blocks a user from the superadmin user listing route", async () => {
    const user = await createUser({
      name: "Alice User",
      email: "alice@example.com",
    });
    const token = await login(user.email);

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});

describe("request scoping and workflow", () => {
  it("limits normal users to their own requests", async () => {
    const manager = await createUser({
      name: "Manager Admin",
      email: "manager@example.com",
      role: "admin",
    });
    const requester = await createUser({
      name: "Requester One",
      email: "requester@example.com",
      managerId: manager._id,
    });
    const anotherRequester = await createUser({
      name: "Requester Two",
      email: "another@example.com",
      managerId: manager._id,
    });

    await TravelRequest.create({
      requestedBy: requester._id,
      approver: manager._id,
      ...buildRequestPayload(),
    });
    await TravelRequest.create({
      requestedBy: anotherRequester._id,
      approver: manager._id,
      ...buildRequestPayload({ purposeOfTrip: "Other trip" }),
    });

    const token = await login(requester.email);
    const response = await request(app)
      .get("/api/requests")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].requestedBy.email).toBe(requester.email);
    expect(response.body.pagination.total).toBe(1);
  });

  it("allows an assigned admin approver to approve a pending request", async () => {
    const manager = await createUser({
      name: "Manager Admin",
      email: "manager@example.com",
      role: "admin",
    });
    const requester = await createUser({
      name: "Requester One",
      email: "requester@example.com",
      managerId: manager._id,
    });

    const createToken = await login(requester.email);
    const createResponse = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${createToken}`)
      .send(buildRequestPayload());

    const approveToken = await login(manager.email);
    const approveResponse = await request(app)
      .patch(`/api/requests/${createResponse.body._id}/approve`)
      .set("Authorization", `Bearer ${approveToken}`)
      .send({});

    expect(createResponse.status).toBe(201);
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.status).toBe("approved");
    expect(approveResponse.body.decision.comment).toBeNull();
  });

  it("stores history and resets status when a rejected request is resubmitted", async () => {
    const manager = await createUser({
      name: "Manager Admin",
      email: "manager@example.com",
      role: "admin",
    });
    const requester = await createUser({
      name: "Requester One",
      email: "requester@example.com",
      managerId: manager._id,
    });

    const requesterToken = await login(requester.email);
    const createResponse = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(buildRequestPayload());

    const managerToken = await login(manager.email);
    const rejectResponse = await request(app)
      .patch(`/api/requests/${createResponse.body._id}/reject`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ comment: "Please add more detail." });

    expect(rejectResponse.status).toBe(200);

    const resubmitResponse = await request(app)
      .patch(`/api/requests/${createResponse.body._id}`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(
        buildRequestPayload({
          purposeOfTrip: "Updated field monitoring visit",
        })
      );

    expect(resubmitResponse.status).toBe(200);
    expect(resubmitResponse.body.status).toBe("pending");
    expect(resubmitResponse.body.version).toBe(2);
    expect(resubmitResponse.body.history).toHaveLength(1);
    expect(resubmitResponse.body.history[0].status).toBe("rejected");
    expect(resubmitResponse.body.history[0].decision.comment).toBe(
      "Please add more detail."
    );
  });

  it("prevents a non-approver admin from approving someone else's request", async () => {
    const manager = await createUser({
      name: "Manager Admin",
      email: "manager@example.com",
      role: "admin",
    });
    const otherAdmin = await createUser({
      name: "Other Admin",
      email: "other-admin@example.com",
      role: "admin",
    });
    const requester = await createUser({
      name: "Requester One",
      email: "requester@example.com",
      managerId: manager._id,
    });

    const requesterToken = await login(requester.email);
    const createResponse = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send(buildRequestPayload());

    const otherAdminToken = await login(otherAdmin.email);
    const approveResponse = await request(app)
      .patch(`/api/requests/${createResponse.body._id}/approve`)
      .set("Authorization", `Bearer ${otherAdminToken}`)
      .send({});

    expect(approveResponse.status).toBe(403);
  });

  it("lets admins filter requests by status and search term", async () => {
    const manager = await createUser({
      name: "Manager Admin",
      email: "manager@example.com",
      role: "admin",
    });
    const requester = await createUser({
      name: "Requester One",
      email: "requester@example.com",
      managerId: manager._id,
    });

    await TravelRequest.create({
      requestedBy: requester._id,
      approver: manager._id,
      status: "pending",
      ...buildRequestPayload({ purposeOfTrip: "Kisumu monitoring visit" }),
    });
    await TravelRequest.create({
      requestedBy: requester._id,
      approver: manager._id,
      status: "approved",
      ...buildRequestPayload({ purposeOfTrip: "Nairobi workshop" }),
    });

    const token = await login(manager.email);
    const response = await request(app)
      .get("/api/requests?status=pending&search=Kisumu")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe("pending");
    expect(response.body.data[0].purposeOfTrip).toContain("Kisumu");
  });
});
