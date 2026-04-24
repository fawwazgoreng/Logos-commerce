import { elasticsearch } from "./setup"

export default class ESModel {
    constructor(protected es = elasticsearch) {}

    index = async () => {
        await this.es.index();
    }
}