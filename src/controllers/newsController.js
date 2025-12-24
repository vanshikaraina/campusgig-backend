import News from "../models/News.js";
import Parser from "rss-parser";

const parser = new Parser();

/* ============================
      CREATE NEWS (LOCAL)
============================ */
export const createNews = async (req, res) => {
  try {
    const { title, content, image, tags, category } = req.body;

    const news = await News.create({
      title,
      content,
      image,
      tags,
      category,
      author: req.user._id, 
    });

    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================
      GET ALL LOCAL NEWS
============================ */
export const getAllNews = async (req, res) => {
  try {
    const news = await News.find()
      .sort({ createdAt: -1 })
      .populate("author", "name");

    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================
      GET SINGLE LOCAL NEWS
============================ */
export const getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id).populate("author", "name");

    if (!news) return res.status(404).json({ message: "News not found" });

    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================
      GET LIVE NEWS (FREE RSS)
============================ */
export const getLiveNews = async (req, res) => {
  try {
    const feed = await parser.parseURL(
      "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
    );

    const formattedNews = feed.items.slice(0, 20).map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      contentSnippet: item.contentSnippet,
    }));

    res.json(formattedNews);
  } catch (error) {
    console.error("Error fetching live news:", error);
    res.status(500).json({ message: "Failed to fetch live news" });
  }
};
