const Company = require('../models/Company');
const User = require('../models/User');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const mongoose = require('mongoose');

// Create a new company (superuser only)
const createCompany = async (req, res) => {
  try {
    const { name, systemPrompt } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Generate slug from name
    const baseSlug = Company.generateSlug(name);

    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await Company.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const company = new Company({
      name: name.trim(),
      slug,
      systemPrompt: systemPrompt?.trim() || undefined,
      createdBy: req.user._id
    });

    await company.save();

    res.status(201).json({
      message: 'Company created successfully',
      company
    });
  } catch (error) {
    console.error('Create company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List all companies (superuser only)
const listCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach document counts per company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const docCount = await Document.countDocuments({ companyId: company._id });
        const chunkCount = await DocumentChunk.countDocuments({ companyId: company._id });
        return {
          ...company.toObject(),
          stats: { documents: docCount, chunks: chunkCount }
        };
      })
    );

    res.json({ companies: companiesWithStats, total: companiesWithStats.length });
  } catch (error) {
    console.error('List companies error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single company by ID with its documents (superuser only)
const getCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id).populate('createdBy', 'name email');
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const documents = await Document.find({ companyId: id }).sort({ createdAt: -1 });

    res.json({ company, documents });
  } catch (error) {
    console.error('Get company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update company name / system prompt (superuser only)
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, systemPrompt, settings } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (name) company.name = name.trim();
    if (systemPrompt !== undefined) company.systemPrompt = systemPrompt.trim();
    if (settings?.maxDocuments) company.settings.maxDocuments = settings.maxDocuments;
    if (settings?.maxFileSizeMB) company.settings.maxFileSizeMB = settings.maxFileSizeMB;

    await company.save();

    res.json({ message: 'Company updated successfully', company });
  } catch (error) {
    console.error('Update company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a company and all its associated data (superuser only)
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete all chunks, documents, then the company
    await DocumentChunk.deleteMany({ companyId: id });
    await Document.deleteMany({ companyId: id });

    // Unlink users from this company
    await User.updateMany({ companyId: id }, { $set: { companyId: null } });

    await Company.findByIdAndDelete(id);

    res.json({ message: 'Company and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Assign a user to a company (superuser only)
const assignUserToCompany = async (req, res) => {
  try {
    const { userId, companyId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ error: 'Invalid user or company ID' });
    }

    const [user, company] = await Promise.all([
      User.findById(userId),
      Company.findById(companyId)
    ]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!company) return res.status(404).json({ error: 'Company not found' });

    user.companyId = companyId;
    await user.save();

    res.json({ message: 'User assigned to company successfully', user: user.toPublicJSON() });
  } catch (error) {
    console.error('Assign user to company error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  assignUserToCompany
};
